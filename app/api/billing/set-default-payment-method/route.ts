import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // If user has no Stripe customer ID, they can't set a default payment method
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { success: false, message: 'No customer account found' },
        { status: 400 }
      );
    }

    // Get payment method ID from request
    const { paymentMethodId } = await request.json();
    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, message: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Update the customer's default payment method in Stripe
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Check if we need to use a temporary solution without the database model
    try {
      // Try to use the PaymentMethod model
      // First, set all payment methods to non-default
      await prisma.$transaction([
        prisma.paymentMethod.updateMany({
          where: { userId: user.id },
          data: { isDefault: false },
        }),
        // Then set the selected one as default
        prisma.paymentMethod.updateMany({
          where: { 
            userId: user.id,
            stripePaymentMethodId: paymentMethodId,
          },
          data: { isDefault: true },
        }),
      ]);
    } catch (error) {
      console.warn('PaymentMethod model may not be available yet:', error);
      // Continue without updating the database - it will be synced on next fetch
    }

    return NextResponse.json({
      success: true,
      message: 'Default payment method updated successfully',
    });
  } catch (error: any) {
    console.error('Error setting default payment method:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to set default payment method' },
      { status: 500 }
    );
  }
} 