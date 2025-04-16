import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { TwilioPhoneNumber, Chatbot } from '@prisma/client';
import Stripe from 'stripe';
import { formatDate, addMonths } from '@/lib/date-utils';
import { getTwilioWebhookUrls } from '@/lib/twilio';
import twilio from 'twilio';
import { v4 as uuidv4 } from 'uuid';

type PhoneNumberWithChatbot = TwilioPhoneNumber & {
  chatbot: Chatbot | null;
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

// Initialize Twilio client with your main account credentials
const twilioMainClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// GET /api/twilio/phone-numbers - Get all phone numbers for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Fetch user AND their payment methods from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        paymentMethods: { // Include payment methods relation
           where: { isDefault: true } // Optimization: Only fetch the default one if needed
        } 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine if a default payment method exists directly from the fetched data
    const hasDefaultPaymentMethod = user.paymentMethods.length > 0;
    console.log(`[GET /phone-numbers] User: ${userId}, Found Default PM in DB: ${hasDefaultPaymentMethod}`);

    // Get all phone numbers for the current user
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      where: {
        userId,
      },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
       orderBy: {
        purchasedAt: 'desc' // Order by purchase date
       }
    });
    
    // Format phone numbers for the frontend
    const formattedPhoneNumbers = phoneNumbers.map((phone) => {
      // Determine status: ALWAYS suspended if no default payment method, otherwise use DB status
      const currentStatus = !hasDefaultPaymentMethod ? 'suspended' : phone.status;

      return {
        id: phone.id,
        number: phone.phoneNumber,
        agentId: phone.chatbotId,
        agentName: phone.chatbot?.name || null,
        boughtOn: phone.purchasedAt.toISOString(),
        renewsOn: phone.renewalDate.toISOString(),
        monthlyFee: `$${phone.monthlyPrice.toFixed(2)}`, // Ensure formatting
        status: currentStatus, // Use the calculated status
        twilioSid: phone.twilioSid as string | undefined,
      };
    });
    
    return NextResponse.json({ phoneNumbers: formattedPhoneNumbers });
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// The shape of the request body for creating a phone number
const createPhoneNumberSchema = z.object({
  phoneNumber: z.string(),
  country: z.string(),
  monthlyPrice: z.number(),
});

// Helper function to save/update payment method in local DB
async function savePaymentMethodToDb(userId: string, paymentMethod: Stripe.PaymentMethod) {
    if (!paymentMethod.card) {
        console.warn(`Payment method ${paymentMethod.id} is not a card, skipping DB save.`);
        return;
    }
    try {
        // Ensure only one default PM per user in DB
        await prisma.paymentMethod.updateMany({
            where: { userId: userId, isDefault: true },
            data: { isDefault: false },
        });
        
        await prisma.paymentMethod.upsert({
            where: { stripePaymentMethodId: paymentMethod.id },
            update: {
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                expMonth: paymentMethod.card.exp_month,
                expYear: paymentMethod.card.exp_year,
                isDefault: true, // Make the newly added card default in DB
                userId: userId,
            },
            create: {
                stripePaymentMethodId: paymentMethod.id,
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                expMonth: paymentMethod.card.exp_month,
                expYear: paymentMethod.card.exp_year,
                isDefault: true, // Make the newly added card default in DB
                userId: userId,
            },
        });
        console.log(`Saved/Updated payment method ${paymentMethod.id} in database.`);
    } catch (dbError) {
        console.error(`Error saving payment method ${paymentMethod.id} to DB:`, dbError);
        // Non-critical, log and continue
    }
}

// POST /api/twilio/phone-numbers - Purchase a new phone number
export async function POST(req: NextRequest) {
  let invoice;
  let confirmedPaymentIntent: Stripe.PaymentIntent | null = null; // Keep this
  let newPaymentMethodId: string | null = null; // To store PM ID from intent

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('No user session found');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    console.log('Processing phone number purchase for user:', userId);
    
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    // Validate required fields
    const { phoneNumber, monthlyPrice, paymentMethodId, selectedAgentId, testMode } = body;
    
    // Special test/development mode to bypass payment
    const skipPayment = testMode === 'development_testing_mode';
    
    if (!phoneNumber) {
      console.error('Missing phoneNumber in request');
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }
    
    if (!monthlyPrice) {
      console.error('Missing monthlyPrice in request');
      return NextResponse.json({ success: false, error: 'Monthly price is required' }, { status: 400 });
    }
    
    // Ensure phoneNumber is in correct format (E.164)
    const phoneNumberString = String(phoneNumber).trim();
    if (!phoneNumberString.startsWith('+')) {
      console.error('Invalid phone number format:', phoneNumberString);
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number must be in E.164 format (e.g. +11234567890)' 
      }, { status: 400 });
    }
    
    // Check if user exists and has valid payment setup
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        stripeCustomerId: true,
        email: true,
        twilioSubaccountSid: true,
        paymentMethods: true
      }
    });
    
    if (!user) {
      console.error('User not found:', userId);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 400 });
    }
    
    if (!user.stripeCustomerId) {
      console.error('User has no Stripe customer ID:', userId);
      return NextResponse.json({ success: false, error: 'No payment method available' }, { status: 400 });
    }

    // Check if the user already owns this phone number
    const existingNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        userId,
        phoneNumber: phoneNumberString
      }
    });
    
    if (existingNumber) {
      console.error('User already owns this phone number:', phoneNumberString);
      return NextResponse.json({ 
        success: false, 
        error: 'You already own this phone number' 
      }, { status: 400 });
    }
    
    // Default payment method for this customer
    const defaultPaymentMethod = user.paymentMethods.find(pm => pm.isDefault) || user.paymentMethods[0];
    
    try {
      // Payment processing
      let paymentIntent: any;
      
      if (skipPayment) {
        // Skip payment for testing, create a mock payment intent
        console.log('TEST MODE: Skipping actual payment for testing');
        paymentIntent = {
          id: `test_pi_${Date.now()}`,
          status: 'succeeded',
          amount: Math.round(parseFloat(monthlyPrice.toString()) * 100),
          currency: 'usd'
        };
      } else {
        // Create a payment intent for the phone number purchase
        // This is a one-time charge for purchasing the phone number
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(parseFloat(monthlyPrice.toString()) * 100), // Convert to cents
          currency: 'usd',
          customer: user.stripeCustomerId,
          payment_method: defaultPaymentMethod.stripePaymentMethodId,
          off_session: true, // Since we're charging without the customer present
          confirm: true, // Confirm the payment immediately
          description: `Phone number purchase: ${phoneNumber}`,
          metadata: {
            userId,
            phoneNumber,
            type: 'phone_number_purchase',
          },
        });
      }
      
      // If payment succeeds, proceed with Twilio purchase
      if (paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded. Purchasing phone number:', phoneNumber);
        
        try {
          // Get or create a Twilio subaccount for the user
          let subaccountSid = user.twilioSubaccountSid;
          
          if (!subaccountSid) {
            // Create a new subaccount via our API
            console.log('Creating new Twilio subaccount for user:', userId);
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
            console.log('Subaccount creation response:', data);
            
            if (!data.success || !data.subaccountSid) {
              console.error('Failed to create Twilio subaccount:', data);
              throw new Error('Failed to create Twilio subaccount');
            }
            
            subaccountSid = data.subaccountSid;
            
            // Update user with new subaccount SID
            await prisma.user.update({
              where: { id: userId },
              data: { twilioSubaccountSid: subaccountSid }
            });
            console.log('User updated with subaccount SID:', subaccountSid);
          } else {
            console.log('Using existing subaccount:', subaccountSid);
          }
          
          // Create a Twilio client for the subaccount
          console.log('Creating Twilio client with subaccount SID');
          const subaccountClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN,
            { accountSid: subaccountSid }
          );
          
          // Try to purchase the phone number using Twilio API
          console.log('Attempting to purchase phone number on Twilio:', phoneNumberString);
          let purchasedNumber;
          try {
            // Get webhook URLs based on environment
            const { smsUrl, voiceUrl } = getTwilioWebhookUrls(skipPayment);
              
            purchasedNumber = await subaccountClient.incomingPhoneNumbers.create({
              phoneNumber: phoneNumberString,
              smsUrl,
              voiceUrl,
            });
            console.log('Phone number purchased successfully on Twilio, SID:', purchasedNumber.sid);
          } catch (twilioError: any) {
            console.error('Twilio API error when purchasing number:', twilioError);
            
            if (twilioError.code === 21422) {
              console.error('Invalid phone number format');
              return NextResponse.json({ 
                success: false, 
                error: `Invalid phone number format. Please use E.164 format (e.g. +11234567890).` 
              }, { status: 400 });
            }
            
            if (twilioError.code === 21452) {
              console.error('Phone number is not available');
              return NextResponse.json({ 
                success: false, 
                error: `This phone number is no longer available for purchase.` 
              }, { status: 400 });
            }
            
            console.error('Twilio error details:', {
              code: twilioError.code,
              message: twilioError.message,
              status: twilioError.status,
              moreInfo: twilioError.moreInfo
            });
            
            // Refund the payment since the Twilio purchase failed
            try {
              if (!skipPayment) {
                await stripe.refunds.create({
                  payment_intent: paymentIntent.id,
                  reason: 'requested_by_customer'
                });
                console.log('Payment refunded due to Twilio error');
              } else {
                console.log('TEST MODE: No need to refund test payment');
              }
            } catch (refundError) {
              console.error('Failed to refund payment:', refundError);
            }
            
            return NextResponse.json({ 
              success: false, 
              error: `Twilio API error: ${twilioError.message}` 
            }, { status: 500 });
          }
          
          // Calculate renewal date (1 month from now)
          const renewalDate = new Date();
          renewalDate.setMonth(renewalDate.getMonth() + 1);
          
          // Save the phone number to the database
          console.log('Saving phone number to database');
          try {
            const newPhoneNumber = await prisma.twilioPhoneNumber.create({
              data: {
                phoneNumber,
                twilioSid: purchasedNumber.sid,
                country: body.country || 'US',
                monthlyPrice: parseFloat(monthlyPrice.toString()),
                status: 'active',
                purchasedAt: new Date(),
                renewalDate,
                user: {
                  connect: {
                    id: userId,
                  },
                },
                ...(selectedAgentId
                  ? {
                      chatbot: {
                        connect: {
                          id: selectedAgentId,
                        },
                      },
                    }
                  : {}),
              },
            });
            console.log('Phone number saved to database:', newPhoneNumber.id);
            
            // Create an invoice record for the purchase
            invoice = await prisma.invoice.create({
              data: {
                stripePaymentIntentId: paymentIntent.id,
                amount: parseFloat(monthlyPrice.toString()),
                status: 'paid',
                description: skipPayment 
                  ? `TEST MODE: Purchase of phone number ${phoneNumber}` 
                  : `Purchase of phone number ${phoneNumber}`,
                type: 'purchase',
                userId,
                twilioPhoneNumberId: newPhoneNumber.id,
              },
            });
            console.log('Invoice created:', invoice.id);
            
            return NextResponse.json({ 
              success: true, 
              message: 'Phone number purchased successfully',
              phoneNumber: newPhoneNumber 
            });
          } catch (dbError: any) {
            console.error('Database error saving phone number:', dbError);
            
            // Try to release the number from Twilio since we couldn't save it
            try {
              await subaccountClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
              console.log('Released phone number from Twilio due to database error');
            } catch (releaseError) {
              console.error('Failed to release phone number from Twilio:', releaseError);
            }
            
            // Try to refund the customer
            try {
              if (!skipPayment) {
                await stripe.refunds.create({
                  payment_intent: paymentIntent.id,
                  reason: 'requested_by_customer'
                });
                console.log('Payment refunded due to database error');
              } else {
                console.log('TEST MODE: No need to refund test payment');
              }
            } catch (refundError) {
              console.error('Failed to refund payment:', refundError);
            }
            
            return NextResponse.json({ 
              success: false, 
              error: `Database error: ${dbError.message}` 
            }, { status: 500 });
          }
        } catch (provisioningError: any) {
          console.error('Error during phone number provisioning:', provisioningError);
          
          // Try to refund the customer if we already charged them
          try {
            if (!skipPayment) {
              await stripe.refunds.create({
                payment_intent: paymentIntent.id,
                reason: 'requested_by_customer'
              });
              console.log('Payment refunded due to provisioning error');
            } else {
              console.log('TEST MODE: No need to refund test payment');
            }
          } catch (refundError) {
            console.error('Failed to refund payment:', refundError);
          }
          
          return NextResponse.json({ 
            success: false, 
            error: provisioningError.message || 'Failed to provision phone number'
          }, { status: 500 });
        }
      } else {
        console.log('Payment intent not succeeded:', paymentIntent.status);
        return NextResponse.json({ 
          success: false, 
          error: `Payment failed with status: ${paymentIntent.status}`
        }, { status: 400 });
      }
    } catch (error) {
      console.error('Error charging payment method:', error);
      
      // Now we can safely check invoice since it's defined in the outer scope
      if (invoice) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'failed' }
        });
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to purchase phone number' 
    }, { status: 500 });
  } catch (error) {
    console.error('Error purchasing phone number:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purchase phone number' },
      { status: 500 }
    );
  }
}

// GET endpoint to list phone numbers
export async function GET_LIST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get phone numbers associated with the user
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      where: { userId: user.id },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response
    const formattedPhoneNumbers = phoneNumbers.map((number) => ({
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

// POST endpoint to purchase a phone number
export async function POST_PURCHASE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a payment method
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { success: false, message: 'No payment method found. Please add a payment method in settings.' },
        { status: 400 }
      );
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No payment method found. Please add a payment method in settings.' },
        { status: 400 }
      );
    }

    // Parse request body
    const { phoneNumber, chatbotId } = await request.json();
    const selectedAgentId = chatbotId;
    // Check for test mode
    const testMode = request.headers.get('x-test-mode') === 'development_testing_mode';
    const skipPayment = testMode;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Check if chatbot exists if chatbotId is provided
    if (selectedAgentId) {
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: selectedAgentId, userId: user.id },
      });

      if (!chatbot) {
        return NextResponse.json(
          { success: false, message: 'Chatbot not found or does not belong to the user' },
          { status: 404 }
        );
      }

      // Check if chatbot already has a phone number
      const existingPhoneNumber = await prisma.twilioPhoneNumber.findFirst({
        where: { chatbotId: selectedAgentId },
      });

      if (existingPhoneNumber) {
        return NextResponse.json(
          { success: false, message: 'This chatbot already has a phone number assigned. Please unassign it first.' },
          { status: 400 }
        );
      }
    }

    // Check if the phone number is already purchased by the user
    const existingPhoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: { phoneNumber },
    });

    if (existingPhoneNumber) {
      return NextResponse.json(
        { success: false, message: 'This phone number is already purchased' },
        { status: 400 }
      );
    }

    // Purchase phone number from Twilio
    let twilioResponse;
    try {
      // Get webhook URLs based on environment
      const { smsUrl, voiceUrl } = getTwilioWebhookUrls(skipPayment);
      
      twilioResponse = await twilioMainClient.incomingPhoneNumbers.create({
        phoneNumber,
        smsUrl,
        voiceUrl,
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, message: error.message || 'Failed to purchase phone number from Twilio' },
        { status: 500 }
      );
    }

    // Create the phone number record in our database
    const monthlyPrice = 7.99; // Base price for phone numbers
    const renewalDate = addMonths(new Date(), 1);

    const createdPhoneNumber = await prisma.twilioPhoneNumber.create({
      data: {
        phoneNumber,
        twilioSid: twilioResponse.sid,
        country: 'US', // Default to US or extract from response if available
        monthlyPrice,
        renewalDate,
        userId: user.id,
        chatbotId: selectedAgentId || null,
        status: 'active',
      },
    });

    // If chatbotId provided, update the chatbot with the phone number
    if (selectedAgentId) {
      await prisma.chatbot.update({
        where: { id: selectedAgentId },
        data: { phoneNumber },
      });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Phone number purchased successfully',
      phoneNumber: {
        id: createdPhoneNumber.id,
        number: createdPhoneNumber.phoneNumber,
        twilioSid: createdPhoneNumber.twilioSid,
        country: createdPhoneNumber.country,
        monthlyPrice: `$${createdPhoneNumber.monthlyPrice}`,
        status: createdPhoneNumber.status,
        purchasedAt: formatDate(createdPhoneNumber.purchasedAt),
        renewalDate: formatDate(createdPhoneNumber.renewalDate),
        chatbotId: createdPhoneNumber.chatbotId,
      },
    });
  } catch (error) {
    console.error('Error purchasing phone number:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to purchase phone number' },
      { status: 500 }
    );
  }
} 