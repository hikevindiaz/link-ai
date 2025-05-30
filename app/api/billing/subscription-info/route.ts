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
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: {
        id: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has an active subscription (including trials and beta)
    const validSubscriptionStatuses = ['active', 'trialing', 'beta_active'];
    
    if (!user.stripeSubscriptionId || !validSubscriptionStatuses.includes(user.stripeSubscriptionStatus || '')) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active subscription found',
        subscription: null
      }, { status: 404 });
    }

    // Handle beta users who don't have a Stripe subscription
    if (user.stripeSubscriptionStatus === 'beta_active') {
      // For beta users, create a mock subscription response
      const mockSubscription = {
        id: 'beta_subscription',
        status: 'beta_active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: user.stripeCurrentPeriodEnd ? Math.floor(user.stripeCurrentPeriodEnd.getTime() / 1000) : Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000),
        items: []
      };
      
      return NextResponse.json({
        success: true,
        subscription: mockSubscription
      });
    }

    // Get full subscription details from Stripe for active/trialing subscriptions
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
      expand: ['items.data.price']
    });

    const validStripeStatuses = ['active', 'trialing'];
    if (!validStripeStatuses.includes(subscription.status)) {
      return NextResponse.json({
        success: false,
        error: 'Subscription is not active',
        subscription: null
      }, { status: 404 });
    }

    // Return subscription info needed for proration calculation
    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        items: subscription.items.data.map(item => ({
          id: item.id,
          price_id: item.price.id,
          quantity: item.quantity,
          type: item.price.metadata?.type || 'base'
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching subscription info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription information' },
      { status: 500 }
    );
  }
} 