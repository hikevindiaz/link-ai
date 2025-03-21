import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export const runtime = 'nodejs';

// Define an interface that includes the onboardingCompleted field
interface UserWithOnboarding {
  onboardingCompleted?: boolean;
  companyName?: string | null;
  businessWebsite?: string | null;
  [key: string]: any;
}

export async function GET() {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);

    // If no user is authenticated, return unauthorized
    if (!session?.user) {
      console.log('[API] Onboarding status check: No authenticated user');
      return NextResponse.json({ onboardingCompleted: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[API] Checking onboarding status for user: ${session.user.id}`);

    try {
      // Check if the user has completed onboarding
      const userData = await db.user.findUnique({
        where: { 
          id: session.user.id 
        },
      });

      // If user not found in our database
      if (!userData) {
        console.log(`[API] User ${session.user.id} not found in database`);
        return NextResponse.json({ onboardingCompleted: false }, { status: 200 });
      }

      // Type assertion to access onboardingCompleted and other fields
      const user = userData as UserWithOnboarding;
      console.log(`[API] User ${session.user.id} onboarding status: ${user.onboardingCompleted}`);

      // Return the onboarding status
      return NextResponse.json({ 
        onboardingCompleted: user.onboardingCompleted || false,
        userData: {
          companyName: user.companyName || null,
          businessWebsite: user.businessWebsite || null
        }
      }, { status: 200 });
    } catch (error) {
      console.error('[API] Error retrieving user from database:', error);
      return NextResponse.json({ onboardingCompleted: false, error: 'Database Error' }, { status: 500 });
    }
  } catch (error) {
    console.error('[API] Error checking onboarding status:', error);
    return NextResponse.json({ onboardingCompleted: false, error: 'Internal Server Error' }, { status: 500 });
  }
} 