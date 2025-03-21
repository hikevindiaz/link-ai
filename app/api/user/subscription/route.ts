import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { freePlan, hobbyPlan, basicPlan, proPlan } from "@/config/subscriptions";
import { BETA_MODE } from "@/config/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

// Helper to get the Stripe price ID based on plan ID
function getStripePriceId(planId: string): string | null {
  switch (planId) {
    case "starter":
      return freePlan.stripePriceId;
    case "growth":
      return basicPlan.stripePriceId;
    case "scale":
      return proPlan.stripePriceId;
    default:
      return null;
  }
}

// Handler for GET requests - Get current subscription
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Get the user's subscription details
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
        stripeSubscriptionStatus: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Determine which plan the user is on
    let planId = "free";
    if (user.stripePriceId === basicPlan.stripePriceId) {
      planId = "growth";
    } else if (user.stripePriceId === proPlan.stripePriceId) {
      planId = "scale";
    } else if (user.stripePriceId === freePlan.stripePriceId || !user.stripePriceId) {
      planId = "starter";
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: user.stripeSubscriptionId,
        priceId: user.stripePriceId,
        currentPeriodEnd: user.stripeCurrentPeriodEnd,
        status: user.stripeSubscriptionStatus,
        planId,
        betaMode: BETA_MODE,
      },
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Handler for POST requests - Create or update subscription
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { planId } = body;

    if (!planId) {
      return new NextResponse("Plan ID is required", { status: 400 });
    }

    // Get the Stripe price ID for the plan
    const stripePriceId = getStripePriceId(planId);
    if (!stripePriceId && !BETA_MODE) {
      return new NextResponse("Invalid plan ID", { status: 400 });
    }

    // Get the user's Stripe customer ID
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // If we're in beta mode, just update the user's plan without creating a Stripe subscription
    if (BETA_MODE) {
      // Use type assertion to handle the new field
      const userData: any = {
        stripePriceId: stripePriceId || null,
        stripeSubscriptionStatus: "beta_active",
        // Set a period end 1 year from now for beta users
        stripeCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        // Mark onboarding as completed
        onboardingCompleted: true,
      };

      // Update the user's subscription data
      await db.user.update({
        where: { id: userId },
        data: userData,
      });

      return NextResponse.json({
        success: true,
        message: "Subscription updated in beta mode",
        planId,
      });
    }

    // For non-beta mode, we'd create/update a real subscription here
    // This code would handle the actual Stripe subscription creation and management
    
    return NextResponse.json({
      success: true,
      message: "Subscription created/updated",
      planId,
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 