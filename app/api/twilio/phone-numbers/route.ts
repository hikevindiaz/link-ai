import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db as prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';
import { formatDate, addMonths } from '@/lib/date-utils';
import { getTwilioWebhookUrls } from '@/lib/twilio';
import twilio from 'twilio';
import { getUserPhoneNumbersWithStatus } from '@/lib/phone-number-status';
import { getOrCreateStripePhonePrice } from '@/lib/stripe-phone-pricing';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

// Initialize Twilio client with your main account credentials
const twilioMainClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// GET /api/twilio/phone-numbers - List user's phone numbers with calculated status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    console.log(`[GET /phone-numbers] User: ${userId}`);
    
    // Get phone numbers with calculated status
    const phoneNumbersWithStatus = await getUserPhoneNumbersWithStatus(userId);
    
    // Format for frontend
    const formattedPhoneNumbers = phoneNumbersWithStatus.map((number) => ({
      id: number.id,
      number: number.phoneNumber,
      twilioSid: number.twilioSid,
      agentId: number.chatbotId || null,
      agentName: number.chatbot?.name || null,
      country: number.country,
      boughtOn: formatDate(number.purchasedAt),
      renewsOn: formatDate(number.renewalDate),
      monthlyFee: `$${number.monthlyPrice}`,
      status: number.status,
      calculatedStatus: number.calculatedStatus,
      warningMessage: number.warningMessage,
    }));
    
    return NextResponse.json({
      success: true,
      phoneNumbers: formattedPhoneNumbers,
    });
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}

// POST /api/twilio/phone-numbers - Purchase a new phone number
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('No user session found');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    console.log('[Phone Purchase] Starting for user:', userId);
    
    const body = await req.json();
    console.log('[Phone Purchase] Request body:', JSON.stringify(body));
    
    const { phoneNumber, selectedAgentId } = body;
    
    if (!phoneNumber) {
      console.error('[Phone Purchase] Missing phoneNumber in request');
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }
    
    // Ensure phoneNumber is in correct format (E.164)
    const phoneNumberString = String(phoneNumber).trim();
    if (!phoneNumberString.startsWith('+')) {
      console.error('[Phone Purchase] Invalid phone number format:', phoneNumberString);
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number must be in E.164 format (e.g. +11234567890)' 
      }, { status: 400 });
    }
    
    // Get user with subscription and payment methods
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        paymentMethods: { orderBy: { createdAt: 'desc' } }
      }
    });
    
    if (!user) {
      console.error('[Phone Purchase] User not found:', userId);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 400 });
    }
    
    // Check for valid subscription (including trials and beta users)
    const validSubscriptionStatuses = ['active', 'trialing', 'beta_active'];
    
    if (!user.stripeSubscriptionId || !user.stripeSubscriptionStatus || !validSubscriptionStatuses.includes(user.stripeSubscriptionStatus)) {
      console.error('[Phone Purchase] User has no active subscription:', userId, 'Status:', user.stripeSubscriptionStatus);
      return NextResponse.json({ 
        success: false, 
        error: 'You need an active subscription to purchase phone numbers. Please subscribe to a plan first.' 
      }, { status: 400 });
    }

    // Check for payment methods
    if (user.paymentMethods.length === 0) {
      console.error('[Phone Purchase] User has no payment methods:', userId);
      return NextResponse.json({ 
        success: false, 
        error: 'You need a payment method to purchase phone numbers. Please add a payment method first.',
        requiresPaymentMethod: true
      }, { status: 400 });
    }

    // Check if the user already owns this phone number
    const existingNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        userId,
        phoneNumber: phoneNumberString
      }
    });
    
    if (existingNumber) {
      console.error('[Phone Purchase] User already owns this phone number:', phoneNumberString);
      return NextResponse.json({ 
        success: false, 
        error: 'You already own this phone number' 
      }, { status: 400 });
    }
    
    try {
      // STEP 1: Calculate pricing
      const detectedCountry = body.country || 'US';
      console.log('[Phone Purchase] Phone number:', phoneNumberString);
      console.log('[Phone Purchase] Country from request:', body.country);
      console.log('[Phone Purchase] Using country for pricing:', detectedCountry);
      
      const { price: stripePrice, pricing } = await getOrCreateStripePhonePrice(
        phoneNumberString,
        detectedCountry
      );
      
      console.log(`[Phone Purchase] Dynamic pricing for ${detectedCountry}: Twilio=$${pricing.twilioPrice}, Markup=$${pricing.markup}, Total=$${pricing.totalPrice}`);
      
      const monthlyPrice = pricing.totalPrice;
      
      // STEP 2: Calculate proration for immediate charge
      console.log('[Phone Purchase] Calculating proration...');
      
      // Get the current subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      // Calculate prorated amount
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      const currentPeriodStart = new Date(subscription.current_period_start * 1000);
      let totalDaysInPeriod = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.ceil((currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      // Special handling for trial subscriptions - use standard monthly period for proration
      if (subscription.status === 'trialing') {
        console.log(`[Phone Purchase] Trial detected - using 30-day period instead of ${totalDaysInPeriod}-day trial period`);
        totalDaysInPeriod = 30; // Standard monthly billing period
      }
      
      const proratedAmount = Math.round((monthlyPrice * daysRemaining / totalDaysInPeriod) * 100); // in cents
      
      console.log(`[Phone Purchase] Proration (${subscription.status}): ${daysRemaining}/${totalDaysInPeriod} days = $${(proratedAmount / 100).toFixed(2)}`);
      console.log(`[Phone Purchase] Monthly price: $${monthlyPrice}, Prorated: $${(proratedAmount / 100).toFixed(2)}`);
      
      // STEP 3: Create a separate standalone invoice for the prorated amount
      // This approach avoids conflicts with existing paid subscription invoices
      console.log('[Phone Purchase] Creating standalone invoice for immediate prorated charge...');
      
      let paidInvoice;
      
      try {
        // Create invoice item and invoice in one step for standalone billing
        const invoice = await stripe.invoices.create({
          customer: user.stripeCustomerId!,
          auto_advance: false,
          collection_method: 'charge_automatically',
          description: `Phone Number Purchase - ${phoneNumberString} (Prorated)`,
          metadata: {
            userId,
            phoneNumber: phoneNumberString,
            type: 'phone_number_standalone_purchase'
          }
        });
        
        console.log('[Phone Purchase] Standalone invoice created:', invoice.id);
        
        // Add the prorated charge as an invoice item to this standalone invoice
        const invoiceItem = await stripe.invoiceItems.create({
          customer: user.stripeCustomerId!,
          invoice: invoice.id, // Attach directly to our standalone invoice
          amount: proratedAmount,
          currency: 'usd',
          description: `Phone Number ${phoneNumberString} - Prorated charge (${daysRemaining}/${totalDaysInPeriod} days)`,
          metadata: {
            userId,
            phoneNumber: phoneNumberString,
            type: 'phone_number_proration'
          }
        });
        
        console.log('[Phone Purchase] Invoice item added:', invoiceItem.id);
        
        // Finalize and pay the standalone invoice
        console.log('[Phone Purchase] Finalizing standalone invoice...');
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
        
        console.log('[Phone Purchase] Paying standalone invoice...');
        paidInvoice = await stripe.invoices.pay(invoice.id);
        
        if (paidInvoice.status !== 'paid') {
          throw new Error(`Failed to charge for phone number. Invoice status: ${paidInvoice.status}`);
        }
        
        console.log('[Phone Purchase] Standalone invoice paid successfully:', paidInvoice.id);
        
      } catch (billingError: any) {
        console.error('[Phone Purchase] Billing error:', billingError);
        throw new Error(`Billing failed: ${billingError.message}`);
      }
      
      // STEP 4: Update the subscription to include the phone number as a recurring charge
      console.log('[Phone Purchase] Updating subscription for recurring charges...');
      
      // Get or create the add-on subscription item
      let phoneAddonItem = subscription.items.data.find(item => 
        item.price.metadata?.type === 'phone_addon' && 
        item.price.unit_amount === monthlyPrice * 100
      );
      
      if (phoneAddonItem) {
        // Update quantity
        console.log('[Phone Purchase] Updating existing phone addon quantity...');
        await stripe.subscriptionItems.update(phoneAddonItem.id, {
          quantity: (phoneAddonItem.quantity || 1) + 1
        });
      } else {
        // Create a new price for this phone number cost
        console.log('[Phone Purchase] Creating new phone addon price...');
        const addonPrice = await stripe.prices.create({
          unit_amount: monthlyPrice * 100,
          currency: 'usd',
          recurring: { interval: 'month' },
          product_data: {
            name: `Phone Number Add-on ($${monthlyPrice}/month)`,
            metadata: {
              type: 'phone_addon',
              unitPrice: monthlyPrice.toString()
            }
          },
          metadata: {
            type: 'phone_addon',
            unitPrice: monthlyPrice.toString()
          }
        });
        
        // Add to subscription
        await stripe.subscriptionItems.create({
          subscription: user.stripeSubscriptionId,
          price: addonPrice.id,
          quantity: 1,
          metadata: {
            type: 'phone_addon',
            phoneNumber: phoneNumberString
          }
        });
      }
      
      // STEP 5: Now proceed with Twilio purchase since billing is confirmed
      console.log('[Phone Purchase] Billing successful, proceeding with Twilio purchase...');
      
      // Get or create a Twilio subaccount for the user
      let subaccountSid = user.twilioSubaccountSid;
      
      if (!subaccountSid) {
        // Create a new subaccount via our API
        console.log('[Phone Purchase] Creating new Twilio subaccount for user:', userId);
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/twilio/subaccount`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            friendlyName: `${user.email || userId} - ${new Date().toISOString()}`
          }),
        });
        
        const data = await response.json();
        console.log('[Phone Purchase] Subaccount creation response:', data);
        
        if (!data.success || !data.subaccountSid) {
          console.error('[Phone Purchase] Failed to create Twilio subaccount:', data);
          throw new Error('Failed to create Twilio subaccount');
        }
        
        subaccountSid = data.subaccountSid;
        
        // Update user with new subaccount SID
        await prisma.user.update({
          where: { id: userId },
          data: { twilioSubaccountSid: subaccountSid }
        });
        console.log('[Phone Purchase] User updated with subaccount SID:', subaccountSid);
      }
      
      // Create a Twilio client for the subaccount
      console.log('[Phone Purchase] Creating Twilio client with subaccount SID');
      const subaccountClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
        { accountSid: subaccountSid }
      );
      
      // Try to purchase the phone number using Twilio API
      console.log('[Phone Purchase] Attempting to purchase phone number on Twilio:', phoneNumberString);
      let purchasedNumber;
      try {
        // Get proper webhook URLs - always use production URLs for phone number purchase
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://dashboard.getlinkai.com';
        const webhookBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
        
        const webhookUrls = {
          voiceUrl: `${webhookBaseUrl}/api/twilio/voice`,
          smsUrl: `${webhookBaseUrl}/api/twilio/sms`,
        };
        
        console.log('[Phone Purchase] Setting webhook URLs:', webhookUrls);
          
        purchasedNumber = await subaccountClient.incomingPhoneNumbers.create({
          phoneNumber: phoneNumberString,
          smsUrl: webhookUrls.smsUrl,
          voiceUrl: webhookUrls.voiceUrl,
        });
        console.log('[Phone Purchase] ✓ Phone number purchased successfully on Twilio, SID:', purchasedNumber.sid);
      } catch (twilioError: any) {
        console.error('[Phone Purchase] ❌ Twilio API error when purchasing number:', twilioError);
        
        // CRITICAL: If Twilio purchase fails, we need to refund the customer
        console.log('[Phone Purchase] Creating refund for failed Twilio purchase...');
        try {
          const refund = await stripe.refunds.create({
            charge: paidInvoice.charge as string,
            reason: 'requested_by_customer',
            metadata: {
              reason: 'twilio_purchase_failed',
              phoneNumber: phoneNumberString
            }
          });
          console.log('[Phone Purchase] ✓ Refund created:', refund.id);
        } catch (refundError) {
          console.error('[Phone Purchase] ❌ CRITICAL: Failed to create refund:', refundError);
          // This is critical - log for manual intervention
          console.error('[Phone Purchase] Manual refund required for charge:', paidInvoice.charge);
        }
        
        // Return appropriate error based on Twilio error code
        if (twilioError.code === 21422) {
          return NextResponse.json({ 
            success: false, 
            error: `Invalid phone number format. Please use E.164 format (e.g. +11234567890).`,
            refunded: true
          }, { status: 400 });
        }
        
        if (twilioError.code === 21452) {
          return NextResponse.json({ 
            success: false, 
            error: `This phone number is no longer available for purchase.`,
            refunded: true
          }, { status: 400 });
        }
        
        return NextResponse.json({ 
          success: false, 
          error: `Failed to purchase phone number: ${twilioError.message}`,
          refunded: true
        }, { status: 500 });
      }
      
      // STEP 6: Save to database
      console.log('[Phone Purchase] ✓ Both billing and Twilio purchase successful, saving to database...');
      
      // Calculate renewal date (matches subscription period end)
      const renewalDate = currentPeriodEnd;
      
      // Save the phone number to the database
      const phoneNumberData: any = {
        phoneNumber: phoneNumberString,
        twilioSid: purchasedNumber.sid,
        country: body.country || 'US',
        monthlyPrice,
        status: 'active',
        purchasedAt: new Date(),
        renewalDate,
        userId,
        // Note: We're not storing subscriptionItemId anymore since it's part of the main subscription
        metadata: {
          stripeInvoiceId: paidInvoice.id,
          stripePriceId: stripePrice.id,
          proratedAmount: proratedAmount / 100,
          purchaseType: 'unified_subscription'
        }
      };
      
      if (selectedAgentId) {
        phoneNumberData.chatbotId = selectedAgentId;
      }
      
      const newPhoneNumber = await prisma.twilioPhoneNumber.create({
        data: phoneNumberData,
      });
      console.log('[Phone Purchase] Phone number saved to database:', newPhoneNumber.id);
      
      // Save invoice record for billing history
      await prisma.invoice.create({
        data: {
          userId,
          stripeInvoiceId: paidInvoice.id,
          amount: proratedAmount / 100,
          status: 'paid',
          description: `Phone Number Purchase - ${phoneNumberString}`,
          type: 'phone_number_purchase',
        }
      });
      
      // If an agent was selected, update the agent's phone number
      if (selectedAgentId) {
        console.log('[Phone Purchase] Updating agent with phone number:', selectedAgentId);
        await prisma.chatbot.update({
          where: { id: selectedAgentId },
          data: { phoneNumber: phoneNumberString },
        });
        console.log('[Phone Purchase] ✓ Agent updated with phone number');
      }
      
      console.log('[Phone Purchase] 🎉 Phone number purchase completed successfully!');
      
      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Phone number purchased successfully and added to your subscription!',
        phoneNumber: {
          id: newPhoneNumber.id,
          number: newPhoneNumber.phoneNumber,
          twilioSid: newPhoneNumber.twilioSid,
          country: newPhoneNumber.country,
          monthlyPrice: `$${newPhoneNumber.monthlyPrice}`,
          status: newPhoneNumber.status,
          purchasedAt: formatDate(newPhoneNumber.purchasedAt),
          renewalDate: formatDate(newPhoneNumber.renewalDate),
          chatbotId: newPhoneNumber.chatbotId,
          proratedCharge: `$${(proratedAmount / 100).toFixed(2)}`,
          nextBillingAmount: `$${monthlyPrice}`
        },
      });
      
    } catch (error: any) {
      console.error('[Phone Purchase] Error during phone number purchase:', error);
      
      if (error instanceof Stripe.errors.StripeError) {
        return NextResponse.json({
          success: false,
          error: `Billing error: ${error.message}`
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to purchase phone number. Please try again.'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[Phone Purchase] Error processing phone number purchase:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process phone number purchase' },
      { status: 500 }
    );
  }
} 