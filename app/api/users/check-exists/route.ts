import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// This endpoint checks if a user exists in the database
// Used by middleware to determine where to redirect users after login
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    // Get the authorization header to validate internal API calls
    const authHeader = request.headers.get('Authorization');
    const internalApiKey = `Bearer ${process.env.INTERNAL_API_SECRET}`;
    
    // Validate request is either from an authenticated user or contains the internal API key
    const session = await getServerSession(authOptions);
    
    // If no valid session and not an internal API call, reject
    if (!session?.user && authHeader !== internalApiKey) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Email is required
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if user exists in the database
    const userExists = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true,
        onboardingCompleted: true
      }
    });
    
    return NextResponse.json({
      success: true,
      exists: Boolean(userExists),
      onboardingCompleted: userExists?.onboardingCompleted || false,
      id: userExists?.id || null
    });
  } catch (error) {
    console.error('Error checking user existence:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 