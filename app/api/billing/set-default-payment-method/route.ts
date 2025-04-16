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

    // Update the default status in the local database
    // First, set all payment methods for this user to non-default
    await prisma.paymentMethod.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
    
    // Then, set the selected payment method as default
    const updateResult = await prisma.paymentMethod.updateMany({
      where: { 
        userId: user.id,
        stripePaymentMethodId: paymentMethodId,
      },
      data: { isDefault: true },
    });

    // Check if the update actually affected any rows (i.e., the PM was found)
    if (updateResult.count === 0) {
        console.warn(`Could not find PaymentMethod with stripePaymentMethodId ${paymentMethodId} for user ${user.id} to set as default in DB.`);
        // Optionally return an error here if finding the PM in the DB is critical
        // return NextResponse.json({ success: false, message: 'Payment method not found in database.' }, { status: 404 });
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