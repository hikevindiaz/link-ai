import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { twilio } from "@/lib/twilio";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        if (paymentIntent.metadata?.type === "phone_number_purchase") {
          await handlePhoneNumberPurchase(paymentIntent);
        }
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
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Error processing webhook: ${error.message}`);
    return NextResponse.json(
      { error: `Error processing webhook: ${error.message}` },
      { status: 500 }
    );
  }
}

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
        sid: twilioPhoneNumber.sid,
        phoneNumber: twilioPhoneNumber.phoneNumber,
        status: "active",
        friendlyName: twilioPhoneNumber.friendlyName || phoneNumber,
        userId,
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