import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { setupIntentId } = await request.json();
    if (!setupIntentId) {
      return NextResponse.json(
        { success: false, message: 'Setup intent ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { success: false, message: 'User not found or no Stripe customer' },
        { status: 404 }
      );
    }

    // Retrieve the setup intent from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, message: 'Setup intent not succeeded' },
        { status: 400 }
      );
    }

    if (!setupIntent.payment_method || typeof setupIntent.payment_method !== 'string') {
      return NextResponse.json(
        { success: false, message: 'No payment method found' },
        { status: 400 }
      );
    }

    // Retrieve the payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method);

    if (!paymentMethod.card) {
      return NextResponse.json(
        { success: false, message: 'Only card payment methods are supported' },
        { status: 400 }
      );
    }

    // Attach payment method to customer if not already attached
    if (!paymentMethod.customer) {
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: user.stripeCustomerId,
      });
    }

    // Set as default payment method for invoices
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    // Check if this is the only payment method
    const existingMethods = await prisma.paymentMethod.count({
      where: { userId: user.id },
    });

    const isFirstMethod = existingMethods === 0;

    // If this is the first method or we're making it default, update all others
    if (isFirstMethod) {
      await prisma.paymentMethod.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    // Save to database
    const savedMethod = await prisma.paymentMethod.upsert({
      where: { stripePaymentMethodId: paymentMethod.id },
      update: {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
        isDefault: isFirstMethod,
      },
      create: {
        stripePaymentMethodId: paymentMethod.id,
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
        isDefault: isFirstMethod,
        userId: user.id,
      },
    });

    console.log(`[Save PM] Successfully saved payment method ${paymentMethod.id} for user ${user.id}`);

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: savedMethod.id,
        brand: savedMethod.brand,
        last4: savedMethod.last4,
        expMonth: savedMethod.expMonth,
        expYear: savedMethod.expYear,
        isDefault: savedMethod.isDefault,
      },
    });
  } catch (error) {
    console.error('[Save PM] Error saving payment method:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save payment method' },
      { status: 500 }
    );
  }
} 