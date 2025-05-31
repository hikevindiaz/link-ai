import { db as prisma } from './db';
import { TwilioPhoneNumber, Chatbot, User } from '@prisma/client';
import Stripe from 'stripe';
import twilio from 'twilio';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export type PhoneNumberStatus = 'active' | 'pending' | 'warning' | 'suspended';

type TwilioPhoneNumberWithRelations = TwilioPhoneNumber & {
  chatbot: Chatbot | null;
  user: User;
};

export interface PhoneNumberWithStatus extends TwilioPhoneNumberWithRelations {
  calculatedStatus: PhoneNumberStatus;
  statusReason?: string;
  warningMessage?: string;
}

/**
 * NEW COMPREHENSIVE STATUS CALCULATION
 * Priority: Stripe Subscription → Twilio Validation → Agent Assignment
 */
export async function calculatePhoneNumberStatus(
  phoneNumber: TwilioPhoneNumberWithRelations
): Promise<PhoneNumberWithStatus> {
  console.log(`[Status Calc] Calculating status for ${phoneNumber.phoneNumber}`);
  
  let calculatedStatus: PhoneNumberStatus = 'suspended';
  let statusReason = '';
  let warningMessage = '';

  try {
    // 1. CHECK STRIPE SUBSCRIPTION STATUS (Primary source of truth)
    if (!phoneNumber.subscriptionItemId) {
      // Check if this is a new unified billing number
      const metadata = (phoneNumber as any).metadata || {};
      const isUnifiedBilling = metadata?.purchaseType === 'unified_subscription';
      
      if (isUnifiedBilling) {
        // New unified billing numbers - check user's main subscription
        const user = await prisma.user.findUnique({
          where: { id: phoneNumber.userId },
          include: { paymentMethods: true }
        });

        if (user?.stripeSubscriptionId && user.paymentMethods.length > 0) {
          try {
            const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            console.log(`[Status Calc] Unified billing subscription status: ${subscription.status}`);
            
            if (subscription.status === 'active') {
              calculatedStatus = 'active';
              statusReason = 'Unified billing subscription active';
            } else if (subscription.status === 'trialing') {
              calculatedStatus = 'active'; // Trial users should see active numbers they purchased
              statusReason = 'Unified billing subscription trialing';
            } else if (subscription.status === 'past_due') {
              calculatedStatus = 'warning';
              statusReason = 'Payment past due';
              warningMessage = 'Payment is past due. Please update your payment method to avoid suspension.';
            } else {
              calculatedStatus = 'suspended';
              statusReason = `Unified billing subscription ${subscription.status}`;
              warningMessage = 'Your subscription is not active. Please update your billing to reactivate this number.';
            }
            
            console.log(`[Status Calc] Unified billing number ${phoneNumber.phoneNumber} marked as ${calculatedStatus} (${statusReason})`);
          } catch (error) {
            console.error(`[Status Calc] Error checking unified billing subscription:`, error);
            calculatedStatus = 'warning';
            statusReason = 'Unable to verify subscription';
            warningMessage = 'Unable to verify subscription status. Please contact support.';
          }
        } else {
          calculatedStatus = 'suspended';
          statusReason = 'No subscription or payment methods';
          warningMessage = 'Please add a payment method and subscribe to a plan.';
        }
      } else {
        // Legacy numbers without subscription items - existing logic
        const user = await prisma.user.findUnique({
          where: { id: phoneNumber.userId },
          include: { paymentMethods: true }
        });

        if (user?.stripeSubscriptionId && user.paymentMethods.length > 0) {
          try {
            const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            if (subscription.status === 'active' || subscription.status === 'trialing') {
              // FIXED: Give legacy numbers the benefit of the doubt if user has active/trialing subscription
              calculatedStatus = subscription.status === 'trialing' ? 'pending' : 'active';
              statusReason = `Legacy number with ${subscription.status} subscription`;
              console.log(`[Status Calc] Legacy number ${phoneNumber.phoneNumber} marked as ${calculatedStatus} due to user's ${subscription.status} subscription`);
            } else {
              calculatedStatus = 'warning';
              statusReason = 'Legacy number, subscription not active';
              warningMessage = 'Please contact support to migrate this number to the new billing system.';
            }
          } catch (error) {
            // If we can't check subscription, but user has payment methods, mark as warning instead of suspended
            calculatedStatus = user.paymentMethods.length > 0 ? 'warning' : 'suspended';
            statusReason = 'Cannot verify subscription status';
            warningMessage = user.paymentMethods.length > 0 
              ? 'Unable to verify subscription. Please contact support.' 
              : 'Please add a payment method to activate this number.';
          }
        } else {
          calculatedStatus = 'suspended';
          statusReason = 'No subscription or payment methods';
          warningMessage = 'Please add a payment method and subscribe to a plan.';
        }
      }
    } else {
      // Handle numbers with subscription items (old individual subscription system)
      try {
        const subscriptionItem = await stripe.subscriptionItems.retrieve(phoneNumber.subscriptionItemId);
        const subscription = await stripe.subscriptions.retrieve(subscriptionItem.subscription as string);
        
        console.log(`[Status Calc] Stripe subscription status: ${subscription.status}`);
        
        switch (subscription.status) {
          case 'active':
            calculatedStatus = 'active';
            statusReason = 'Subscription active';
            break;
          case 'past_due':
            calculatedStatus = 'warning';
            statusReason = 'Payment past due';
            warningMessage = 'Payment is past due. Please update your payment method to avoid suspension.';
            break;
          case 'unpaid':
          case 'canceled':
          case 'incomplete_expired':
            calculatedStatus = 'suspended';
            statusReason = `Subscription ${subscription.status}`;
            warningMessage = 'Your subscription is not active. Please update your billing to reactivate this number.';
            break;
          case 'incomplete':
          case 'trialing':
            calculatedStatus = 'pending';
            statusReason = `Subscription ${subscription.status}`;
            break;
          default:
            calculatedStatus = 'suspended';
            statusReason = `Unknown subscription status: ${subscription.status}`;
        }
      } catch (stripeError) {
        console.error(`[Status Calc] Stripe error for ${phoneNumber.phoneNumber}:`, stripeError);
        calculatedStatus = 'suspended';
        statusReason = 'Stripe subscription not found';
        warningMessage = 'Unable to verify subscription status. Please contact support.';
      }
    }

    // 2. VALIDATE WITH TWILIO API (Only if status would be active)
    if (calculatedStatus === 'active' && phoneNumber.twilioSid) {
      try {
        const subaccountSid = phoneNumber.user.twilioSubaccountSid;
        let twilioValidationClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        if (subaccountSid) {
          twilioValidationClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, { 
            accountSid: subaccountSid 
          });
        }
        
        await twilioValidationClient.incomingPhoneNumbers(phoneNumber.twilioSid).fetch();
        console.log(`[Status Calc] Twilio validation successful for ${phoneNumber.phoneNumber}`);
      } catch (twilioError: any) {
        console.error(`[Status Calc] Twilio validation failed for ${phoneNumber.phoneNumber}:`, twilioError);
        
        if (twilioError.code === 20404) {
          calculatedStatus = 'suspended';
          statusReason = 'Number not found on Twilio';
          warningMessage = 'This phone number is no longer available on Twilio. Please contact support.';
        } else {
          // Don't change status for other Twilio errors, just add warning
          warningMessage = 'Unable to verify number status with Twilio. Functionality may be limited.';
        }
      }
    }

    // 3. CHECK WHATSAPP STATUS (Optional enhancement)
    if (calculatedStatus === 'active' || calculatedStatus === 'pending') {
      // WhatsApp is optional, so we don't force pending state
      // Just add information about WhatsApp configuration
      const phoneNumberWithWhatsApp = phoneNumber as any; // Type assertion for WhatsApp fields
      if (phoneNumberWithWhatsApp.whatsappEnabled) {
        statusReason = statusReason ? `${statusReason}, WhatsApp enabled` : 'WhatsApp enabled';
      }
    }

    // 4. AGENT ASSIGNMENT CHECK (Final determinant for active vs pending)
    if (calculatedStatus === 'active') {
      if (!phoneNumber.chatbotId) {
        // Change status to pending if no agent is assigned
        calculatedStatus = 'pending';
        statusReason = 'Waiting for agent assignment';
        warningMessage = 'Assign this number to an agent to activate it for conversations.';
        console.log(`[Status Calc] Number ${phoneNumber.phoneNumber} marked as pending - waiting for agent assignment`);
      } else {
        // Keep as active and update reason
        statusReason = 'Active and assigned to agent';
        console.log(`[Status Calc] Number ${phoneNumber.phoneNumber} is fully active with agent assignment`);
      }
    }

    console.log(`[Status Calc] Final status for ${phoneNumber.phoneNumber}: ${calculatedStatus} (${statusReason})`);

  } catch (error) {
    console.error(`[Status Calc] Unexpected error for ${phoneNumber.phoneNumber}:`, error);
    calculatedStatus = 'suspended';
    statusReason = 'Calculation error';
    warningMessage = 'Unable to determine phone number status. Please contact support.';
  }

  return {
    ...phoneNumber,
    calculatedStatus,
    statusReason,
    warningMessage: warningMessage || undefined
  };
}

/**
 * Get all phone numbers with their calculated status for a user
 */
export async function getUserPhoneNumbersWithStatus(userId: string): Promise<PhoneNumberWithStatus[]> {
  console.log(`[Status] Getting phone numbers with status for user: ${userId}`);
  
  // Get all phone numbers with relations
  const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
    where: { userId },
    include: {
      chatbot: true,
      user: true
    }
  });

  console.log(`[Status] Found ${phoneNumbers.length} phone numbers`);

  // Calculate status for each
  const phoneNumbersWithStatus = await Promise.all(
    phoneNumbers.map(pn => calculatePhoneNumberStatus(pn))
  );

  return phoneNumbersWithStatus;
}

/**
 * Update a single phone number's status in the database
 */
export async function updatePhoneNumberStatus(phoneNumberId: string): Promise<PhoneNumberWithStatus | null> {
  const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
    where: { id: phoneNumberId },
    include: {
      chatbot: true,
      user: true
    }
  });

  if (!phoneNumber) return null;

  const phoneNumberWithStatus = await calculatePhoneNumberStatus(phoneNumber);
  
  // Update the database status to match calculated status
  await prisma.twilioPhoneNumber.update({
    where: { id: phoneNumberId },
    data: { 
      status: phoneNumberWithStatus.calculatedStatus,
      updatedAt: new Date()
    }
  });

  return phoneNumberWithStatus;
}