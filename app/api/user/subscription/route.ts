import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { freePlan, starterPlan, growthPlan, scalePlan } from "@/config/subscriptions";
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { stripePriceId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Direct price ID mapping
    let recommendedPriceId = starterPlan.stripePriceId;
    
    if (user.stripePriceId === scalePlan.stripePriceId) {
      recommendedPriceId = scalePlan.stripePriceId;
    }

    return NextResponse.json({
      success: true,
      recommendedPriceId,
      currentPriceId: user.stripePriceId
    });

  } catch (error) {
    console.error('Error in user subscription API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await req.json();

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate that it's one of our new plan price IDs
    const validPriceIds = [
      starterPlan.stripePriceId,
      growthPlan.stripePriceId,
      scalePlan.stripePriceId
    ];

    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Update user's price ID
    await db.user.update({
      where: { id: user.id },
      data: { stripePriceId: priceId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating user subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 