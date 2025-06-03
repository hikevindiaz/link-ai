import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Get user with verification token
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        emailVerificationToken: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Check if verification token exists
    if (!user.emailVerificationToken) {
      return NextResponse.json(
        { success: false, error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if code matches
    if (user.emailVerificationToken.code !== code) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (new Date() > user.emailVerificationToken.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark email as verified in a transaction
    await db.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      });

      // Delete the verification token
      await tx.emailVerificationToken.delete({
        where: { userId: user.id }
      });
    });

    return NextResponse.json({ 
      success: true,
      message: 'Email verified successfully',
      requiresSessionRefresh: true
    });

  } catch (error) {
    console.error('Error in verify-email/verify:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 