import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Force Node.js runtime instead of Edge Runtime to resolve Prisma issues
export const runtime = 'nodejs';

// Handler for POST requests - Update user information during onboarding
export async function POST(req: Request) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    
    // Parse the form data properly
    const accountData = body.account || {};
    const businessData = body.business || {};
    const billingData = body.billing || {};

    console.log('Processing onboarding data:', { accountData, businessData, billingData });
    
    // Prepare the user data update with all the fields from the schema
    const userData: any = {
      // Account data
      name: accountData.fullName || undefined,
      // Email is not updated during onboarding as it's the user's login
      addressLine1: accountData.addressLine1 || undefined,
      addressLine2: accountData.addressLine2 || undefined,
      city: accountData.city || undefined,
      state: accountData.state || undefined,
      postalCode: accountData.postalCode || undefined,
      country: accountData.country || undefined,
      
      // Business data
      companyName: businessData.companyName || undefined,
      companySize: businessData.companySize || undefined,
      businessWebsite: businessData.businessWebsite || undefined,
      industryType: businessData.industryType || undefined,
      businessTasks: businessData.businessTasks || undefined,
      communicationChannels: businessData.communicationChannels || undefined,
      
      // Mark onboarding as completed
      onboardingCompleted: true,
      
      // Billing data - would normally update subscription
      // For now, we just record the selected plan
      stripePriceId: billingData.selectedPlan || undefined,
    };

    console.log('Updating user with data:', userData);

    // Update user information
    const updatedUser = await db.user.update({
      where: {
        id: userId,
      },
      data: userData,
    });

    console.log('User successfully updated:', updatedUser.id);
    
    // Create response with cookie to track onboarding status
    const response = NextResponse.json({ success: true, user: updatedUser });
    
    // Set a cookie to track onboarding status
    response.cookies.set({
      name: 'onboardingCompleted',
      value: 'true',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    
    return response;
  } catch (error) {
    console.error("[ONBOARDING_ERROR]", error);
    // Return more specific error information for debugging
    return NextResponse.json({ 
      success: false, 
      message: "Failed to complete onboarding",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Handler for GET requests - Get current onboarding status and information
export async function GET(req: Request) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Get user information with generic select to avoid type errors
    const userRaw = await db.user.findUnique({
      where: {
        id: userId,
      },
      // Just select all fields
    });

    if (!userRaw) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Extract the fields we need from the raw user data
    const user = {
      id: userRaw.id,
      name: userRaw.name,
      email: userRaw.email,
      addressLine1: (userRaw as any).addressLine1,
      addressLine2: (userRaw as any).addressLine2,
      city: (userRaw as any).city,
      state: (userRaw as any).state,
      postalCode: (userRaw as any).postalCode,
      country: (userRaw as any).country,
      companyName: (userRaw as any).companyName,
      companySize: (userRaw as any).companySize,
      businessWebsite: (userRaw as any).businessWebsite,
      industryType: (userRaw as any).industryType,
      businessTasks: (userRaw as any).businessTasks,
      communicationChannels: (userRaw as any).communicationChannels,
      onboardingCompleted: (userRaw as any).onboardingCompleted,
    };

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("[ONBOARDING_GET_ERROR]", error);
    // Return more specific error information for debugging
    return NextResponse.json({ 
      success: false, 
      message: "Failed to get onboarding status",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 