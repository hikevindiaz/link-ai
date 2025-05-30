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

    const { paymentMethodId } = await request.json();
    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, message: 'Payment method ID is required' },
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

    // Set as default payment method in Stripe
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Update default status in database
    await prisma.paymentMethod.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });

    await prisma.paymentMethod.updateMany({
      where: { 
        userId: user.id,
        stripePaymentMethodId: paymentMethodId 
      },
      data: { isDefault: true },
    });

    console.log(`[Set Default PM] Successfully set ${paymentMethodId} as default for user ${user.id}`);

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