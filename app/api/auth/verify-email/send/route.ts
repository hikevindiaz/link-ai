import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { email as resend } from '@/lib/email';
import { render } from '@react-email/render';
import EmailConfirmationEmail from '@/emails/confirm-email';

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        email: true, 
        emailVerified: true,
        name: true 
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't send if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create or update verification token
    await db.emailVerificationToken.upsert({
      where: { userId: user.id },
      update: {
        code: verificationCode,
        expiresAt: expiresAt,
        createdAt: new Date()
      },
      create: {
        userId: user.id,
        code: verificationCode,
        expiresAt: expiresAt
      }
    });

    // Send verification email
    try {
      const emailHtml = render(EmailConfirmationEmail({
        confirmationCode: verificationCode,
        theme: 'light'
      }));

      await resend.emails.send({
        from: 'Link AI <no-reply@getlinkai.com>',
        to: user.email,
        subject: `Your Link AI confirmation code: ${verificationCode}`,
        html: emailHtml,
      });

      console.log('Verification email sent to:', user.email);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent successfully'
    });

  } catch (error) {
    console.error('Error in verify-email/send:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 