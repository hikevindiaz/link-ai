import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export async function DELETE(request: Request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // If user has no Stripe customer ID, they can't delete payment methods
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

    // Check if payment method exists in our database and belongs to the user
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: {
        stripePaymentMethodId: paymentMethodId,
      },
    });

    if (!paymentMethod || paymentMethod.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Payment method not found or does not belong to this user' },
        { status: 404 }
      );
    }

    // Delete the payment method from Stripe
    await stripe.paymentMethods.detach(paymentMethodId);

    // Delete the payment method from our database
    await prisma.paymentMethod.delete({
      where: { stripePaymentMethodId: paymentMethodId },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete payment method' },
      { status: 500 }
    );
  }
} 