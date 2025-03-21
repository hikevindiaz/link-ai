import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the user's ID from the session
    const userId = session.user.id;
    
    // Fetch the user's stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        stripeCustomerId: true,
        stripeSubscriptionStatus: true
      },
    });
    
    // Consider a user to have a payment method if they have a stripeCustomerId
    // In a real implementation, you would also check with Stripe API if the customer has a valid payment method
    const hasPaymentMethod = Boolean(user?.stripeCustomerId);
    
    // Check if subscription is active
    const hasActiveSubscription = user?.stripeSubscriptionStatus === 'active';
    
    return NextResponse.json({
      hasPaymentMethod,
      hasActiveSubscription,
    });
  } catch (error) {
    console.error('Error checking payment method:', error);
    return NextResponse.json({ error: 'Failed to check payment method' }, { status: 500 });
  }
} 