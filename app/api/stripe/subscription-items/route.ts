import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

// Schema for adding subscription items
const addSubscriptionItemSchema = z.object({
  itemType: z.enum(['phone_number', 'premium_features', 'extra_storage']),
  stripePriceId: z.string(),
  quantity: z.number().min(1).default(1),
  metadata: z.record(z.any()).optional(),
  phoneNumber: z.string().optional(), // For phone number items
});

// Schema for removing subscription items
const removeSubscriptionItemSchema = z.object({
  subscriptionItemId: z.string(),
});

// GET /api/stripe/subscription-items - List user's subscription items
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's subscription items
    const subscriptionItems = await prisma.subscriptionItem.findMany({
      where: { 
        userId,
        isActive: true 
      },
      include: {
        phoneNumbers: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      subscriptionItems
    });
  } catch (error) {
    console.error('Error fetching subscription items:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription items' },
      { status: 500 }
    );
  }
}

// POST /api/stripe/subscription-items - Add a subscription item
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const validatedData = addSubscriptionItemSchema.parse(body);

    // Get user and verify they have an active subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        email: true
      }
    });

    if (!user?.stripeSubscriptionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active subscription found. Please subscribe to a plan first.' 
      }, { status: 400 });
    }

    // Add the subscription item to Stripe
    const stripeSubscriptionItem = await stripe.subscriptionItems.create({
      subscription: user.stripeSubscriptionId,
      price: validatedData.stripePriceId,
      quantity: validatedData.quantity,
      proration_behavior: 'create_prorations', // Handle prorations automatically
      metadata: {
        userId,
        itemType: validatedData.itemType,
        ...(validatedData.phoneNumber && { phoneNumber: validatedData.phoneNumber }),
        ...(validatedData.metadata || {})
      }
    });

    // Save to our database
    const subscriptionItem = await prisma.subscriptionItem.create({
      data: {
        userId,
        stripeSubscriptionItemId: stripeSubscriptionItem.id,
        stripePriceId: validatedData.stripePriceId,
        itemType: validatedData.itemType,
        quantity: validatedData.quantity,
        metadata: validatedData.metadata || {},
        isActive: true
      }
    });

    console.log(`[Subscription Item] Created: ${subscriptionItem.id} for user ${userId}`);

    return NextResponse.json({
      success: true,
      subscriptionItem: {
        id: subscriptionItem.id,
        stripeSubscriptionItemId: subscriptionItem.stripeSubscriptionItemId,
        itemType: subscriptionItem.itemType,
        quantity: subscriptionItem.quantity,
        isActive: subscriptionItem.isActive
      }
    });
  } catch (error) {
    console.error('Error adding subscription item:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { success: false, message: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to add subscription item' },
      { status: 500 }
    );
  }
}

// DELETE /api/stripe/subscription-items - Remove a subscription item
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const validatedData = removeSubscriptionItemSchema.parse(body);

    // Find the subscription item
    const subscriptionItem = await prisma.subscriptionItem.findFirst({
      where: {
        id: validatedData.subscriptionItemId,
        userId,
        isActive: true
      }
    });

    if (!subscriptionItem) {
      return NextResponse.json({
        success: false,
        error: 'Subscription item not found'
      }, { status: 404 });
    }

    // Remove from Stripe
    await stripe.subscriptionItems.del(
      subscriptionItem.stripeSubscriptionItemId,
      {
        proration_behavior: 'create_prorations' // Handle prorations automatically
      }
    );

    // Mark as inactive in our database
    await prisma.subscriptionItem.update({
      where: { id: subscriptionItem.id },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });

    console.log(`[Subscription Item] Removed: ${subscriptionItem.id} for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Subscription item removed successfully'
    });
  } catch (error) {
    console.error('Error removing subscription item:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { success: false, message: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to remove subscription item' },
      { status: 500 }
    );
  }
} 