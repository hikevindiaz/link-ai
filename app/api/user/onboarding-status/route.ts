import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Force Node.js runtime
export const runtime = 'nodejs';

// Define an interface that includes the onboardingCompleted field
interface UserWithOnboarding {
  onboardingCompleted?: boolean;
  [key: string]: any;
}

// GET endpoint - check current onboarding status
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        message: "Unauthorized" 
      }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get user's onboarding status
    const userData = await db.user.findUnique({
      where: { id: userId },
    });
    
    if (!userData) {
      return NextResponse.json({ 
        success: false, 
        message: "User not found" 
      }, { status: 404 });
    }
    
    // Type assertion to access onboardingCompleted field
    const user = userData as UserWithOnboarding;
    
    // Create response with cookie
    const response = NextResponse.json({ 
      success: true,
      onboardingCompleted: user.onboardingCompleted || false
    });
    
    // Set cookie to match database value
    response.cookies.set({
      name: 'onboardingCompleted',
      value: String(user.onboardingCompleted || false),
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    
    return response;
  } catch (error) {
    console.error("[ONBOARDING_STATUS_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to get onboarding status",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// POST endpoint - update onboarding status
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        message: "Unauthorized" 
      }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    
    // Get the onboarding status from request body
    const onboardingCompleted = body.onboardingCompleted === true;
    
    // Update user in database - use type assertion to handle onboardingCompleted property
    await db.user.update({
      where: { id: userId },
      data: { 
        // Use type assertion to satisfy TypeScript
        onboardingCompleted
      } as any
    });
    
    console.log(`Updated onboarding status for user ${userId} to ${onboardingCompleted}`);
    
    // Create response with cookie
    const response = NextResponse.json({ 
      success: true,
      onboardingCompleted
    });
    
    // Set cookie to match new value
    response.cookies.set({
      name: 'onboardingCompleted',
      value: String(onboardingCompleted),
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    
    return response;
  } catch (error) {
    console.error("[UPDATE_ONBOARDING_STATUS_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to update onboarding status",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 