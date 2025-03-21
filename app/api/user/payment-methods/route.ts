import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Force Node.js runtime instead of Edge Runtime to resolve Prisma issues
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

// Handler for GET requests - Get all payment methods for the user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    console.log('Fetching payment methods for user:', userId);

    // Get the user's Stripe customer ID
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      // User doesn't have a Stripe customer ID yet
      console.log('User has no Stripe customer ID, returning empty list');
      return NextResponse.json({ success: true, paymentMethods: [] });
    }

    console.log('Found Stripe customer ID:', user.stripeCustomerId);

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    // Get the default payment method
    const customerData = await stripe.customers.retrieve(user.stripeCustomerId);
    const defaultPaymentMethodId = typeof customerData === 'object' && !('deleted' in customerData) 
      ? customerData.invoice_settings?.default_payment_method as string
      : null;

    // Format the payment methods
    const formattedPaymentMethods = paymentMethods.data.map((method) => {
      const card = method.card;
      return {
        id: method.id,
        brand: card?.brand,
        last4: card?.last4,
        expMonth: card?.exp_month,
        expYear: card?.exp_year,
        isDefault: method.id === defaultPaymentMethodId,
      };
    });

    console.log(`Found ${formattedPaymentMethods.length} payment methods`);

    return NextResponse.json({
      success: true,
      paymentMethods: formattedPaymentMethods,
    });
  } catch (error) {
    console.error("[PAYMENT_METHODS_GET_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to get payment methods",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Handler for POST requests - Create a setup intent for adding a payment method
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    console.log('Creating payment method setup intent for user:', userId);

    // Get or create a Stripe customer for the user
    let user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    let customerId = user.stripeCustomerId;

    // If the user doesn't have a Stripe customer ID, create one
    if (!customerId) {
      console.log('Creating new Stripe customer for user:', userId);
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          userId,
        },
      });

      console.log('Created new Stripe customer:', customer.id);

      // Save the customer ID to the user
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });

      customerId = customer.id;
    } else {
      console.log('Using existing Stripe customer:', customerId);
    }

    // Create a SetupIntent for the customer
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });

    console.log('Created SetupIntent:', setupIntent.id);

    return NextResponse.json({
      success: true,
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error("[PAYMENT_METHODS_POST_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to create payment method setup intent",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Handler for DELETE requests - Delete a payment method
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const paymentMethodId = searchParams.get("id");

    if (!paymentMethodId) {
      return new NextResponse("Payment method ID is required", { status: 400 });
    }

    // Get the user's Stripe customer ID
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return new NextResponse("Stripe customer not found", { status: 404 });
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PAYMENT_METHODS_DELETE_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to delete payment method",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Handler for PUT requests - Set a payment method as default
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return new NextResponse("Payment method ID is required", { status: 400 });
    }

    // Get the user's Stripe customer ID
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return new NextResponse("Stripe customer not found", { status: 404 });
    }

    // Set the payment method as default
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PAYMENT_METHODS_PUT_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to set default payment method",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 