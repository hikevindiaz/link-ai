import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, priceId } = await request.json();

    if (!userId || !priceId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      }
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Create Stripe customer if doesn't exist
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          userId: user.id
        }
      });
      customerId = customer.id;

      // Update user with customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId }
      });
    }

    // Handle existing subscription
    if (user.stripeSubscriptionId) {
      // Update existing subscription
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        items: [{
          price: priceId,
        }],
        proration_behavior: 'create_prorations',
      });

      // Update user subscription details
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripePriceId: priceId,
          stripeSubscriptionStatus: subscription.status,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription updated successfully',
        subscriptionId: subscription.id
      });
    } else {
      // Create new subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user subscription details
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          stripeSubscriptionStatus: subscription.status,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      });

      // Get client secret if payment setup is needed
      let clientSecret = null;
      if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
        const invoice = subscription.latest_invoice as Stripe.Invoice;
        if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
          const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
          clientSecret = paymentIntent.client_secret;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription created successfully',
        subscriptionId: subscription.id,
        // Include payment intent for setup if needed
        clientSecret
      });
    }

  } catch (error) {
    console.error('Error assigning subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to assign subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 