import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // If no subscription ID, they're not on a paid plan
    if (!user.stripeSubscriptionId) {
      return NextResponse.json({ 
        success: true, 
        subscription: null, 
        isSubscribed: false
      });
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    const subscriptionData = {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end * 1000, // Convert to milliseconds
      priceId: user.stripePriceId,
      stripePriceId: user.stripePriceId, // Add for compatibility
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    return NextResponse.json({
      success: true,
      subscription: subscriptionData,
      isSubscribed: subscription.status === 'active' || subscription.status === 'trialing',
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
} 