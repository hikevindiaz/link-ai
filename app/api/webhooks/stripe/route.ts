import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { twilio } from "@/lib/twilio";
import { PaymentMethod as PrismaPaymentMethod } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

async function savePaymentMethodToDb(userId: string, paymentMethod: Stripe.PaymentMethod) {
    if (!paymentMethod.card) {
        console.warn(`[Webhook] Payment method ${paymentMethod.id} is not a card, skipping DB save.`);
        return;
    }
    try {
        console.log(`[Webhook] Saving PM ${paymentMethod.id} for user ${userId} to DB.`);
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
        console.log(`[Webhook] Successfully saved/updated PM ${paymentMethod.id} in database.`);
    } catch (dbError) {
        console.error(`[Webhook] Error saving payment method ${paymentMethod.id} to DB:`, dbError);
        // Log and potentially alert, but don't necessarily fail the webhook response
    }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
      console.error("Stripe webhook secret is not set.");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent( body, signature, webhookSecret );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Received payment_intent.succeeded: PI=${paymentIntent.id}`);
        // Remove the problematic call to handle purchase here
        // The purchase should be handled synchronously in the POST /api/twilio/phone-numbers route
        // if (paymentIntent.metadata?.type === "phone_number_purchase") {
        //   await handlePhoneNumberPurchase(paymentIntent);
        // }
        // You might add other logic here based on payment intent success if needed,
        // e.g., updating an order status, but not re-triggering the Twilio purchase.
        break;

      case "invoice.payment_succeeded":
        const invoice = event.data.object as Stripe.Invoice;
        
        // Get the subscription
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );
        
        // Check if the user already has an active subscription
        const user = await prisma.user.findFirst({
          where: {
            stripeCustomerId: invoice.customer as string,
          },
        });

        if (!user) {
          console.error("User not found for invoice:", invoice.id);
          break;
        }

        // Update their subscription status
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            stripeSubscriptionStatus: "active",
            stripeCurrentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
          },
        });

        break;
        
      case "setup_intent.succeeded":
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const customerId = setupIntent.customer;
        const paymentMethodId = setupIntent.payment_method;
        
        console.log(`[Webhook] Handling setup_intent.succeeded: SI=${setupIntent.id}, PM=${paymentMethodId}, Cust=${customerId}`);

        if (typeof customerId !== 'string' || typeof paymentMethodId !== 'string') {
            console.error(`[Webhook] Missing customer or payment_method ID in setup_intent.succeeded event. SI=${setupIntent.id}`);
            break; // Exit case if essential IDs are missing
        }

        try {
            // Find the user associated with the Stripe customer ID
            const user = await prisma.user.findFirst({
                where: { stripeCustomerId: customerId },
                select: { id: true }, // Only need the user ID
            });

            if (!user) {
                console.error(`[Webhook] User not found for Stripe customer ID: ${customerId}. SI=${setupIntent.id}`);
                break; // Exit case if user not found
            }

            // Retrieve the full PaymentMethod object from Stripe
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

            if (!paymentMethod) {
                 console.error(`[Webhook] Could not retrieve PaymentMethod ${paymentMethodId} from Stripe. SI=${setupIntent.id}`);
                 break; // Exit case if PM retrieval fails
            }

            // Save the payment method details to the local database
            await savePaymentMethodToDb(user.id, paymentMethod);

            // Set this payment method as the default for the customer in Stripe
            await stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
            });
            console.log(`[Webhook] Set PM ${paymentMethodId} as default for customer ${customerId}.`);
            
        } catch (siError: any) {
            console.error(`[Webhook] Error processing setup_intent.succeeded for SI=${setupIntent.id}: ${siError.message}`, siError);
            // Allow the webhook to return 200 to Stripe, but log the error
        }
        break;
        
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[Webhook] Error processing webhook: ${error.message}`, error);
    return NextResponse.json(
      { error: `Error processing webhook: ${error.message}` },
      { status: 500 }
    );
  }
}

// Remove the entire handlePhoneNumberPurchase function as it's redundant/problematic here
/*
async function handlePhoneNumberPurchase(paymentIntent: Stripe.PaymentIntent) {
  const { phoneNumber, userId } = paymentIntent.metadata;

  if (!phoneNumber || !userId) {
    console.error("Missing required metadata in payment intent", paymentIntent.id);
    return;
  }

  try {
    // Purchase the phone number from Twilio
    const twilioPhoneNumber = await twilio.incomingPhoneNumbers.create({
      phoneNumber,
      smsMethod: "POST",
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms/incoming`,
      voiceMethod: "POST",
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/incoming`,
    });

    // Add the phone number to the database
    const addedPhoneNumber = await prisma.twilioPhoneNumber.create({
      data: {
        twilioSid: twilioPhoneNumber.sid,
        phoneNumber: twilioPhoneNumber.phoneNumber,
        status: "active",
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    // Create an invoice record
    await prisma.invoice.create({
      data: {
        stripeInvoiceId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents to dollars
        status: "paid",
        description: `Purchase of phone number ${phoneNumber}`,
        type: "phone_number_purchase",
        userId,
        twilioPhoneNumberId: addedPhoneNumber.id,
        pdfUrl: null, // Stripe doesn't generate PDFs for payment intents
      },
    });

    console.log(`Successfully purchased phone number ${phoneNumber} for user ${userId}`);
  } catch (error: any) {
    console.error(`Error purchasing phone number: ${error.message}`);
    
    // If there was an error, refund the payment
    try {
      await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        reason: "requested_by_customer",
      });
      
      console.log(`Refunded payment ${paymentIntent.id} due to error`);
    } catch (refundError: any) {
      console.error(`Error refunding payment: ${refundError.message}`);
    }
  }
}
*/