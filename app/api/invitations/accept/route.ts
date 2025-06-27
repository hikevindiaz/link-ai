import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the invitation
    const invitation = await (prisma as any).invitation.findFirst({
      where: {
        token,
        status: 'pending',
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      await (prisma as any).invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });

      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Create the user with verified email and assigned role
    const newUser = await prisma.user.create({
      data: {
        email: invitation.email,
        role: invitation.role,
        emailVerified: new Date(), // Mark email as verified
        onboardingCompleted: false, // They still need to go through onboarding
      },
    });

    // Mark invitation as accepted
    await (prisma as any).invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedBy: newUser.id,
        acceptedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Invitation accepted successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
        onboardingCompleted: newUser.onboardingCompleted,
      },
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to validate invitation tokens (for displaying invitation info)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the invitation
    const invitation = await (prisma as any).invitation.findFirst({
      where: {
        token,
        status: 'pending',
      },
      include: {
        invitedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      await (prisma as any).invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });

      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        invitedByName: invitation.invitedByUser.name,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 