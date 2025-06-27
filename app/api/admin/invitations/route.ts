import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import InvitationEmail from '@/emails/invitation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const { email, role } = await request.json();

    // Validate input
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: trimmedEmail,
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 409 });
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');
    
    // Create invitation with 7 days expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await (prisma as any).invitation.create({
      data: {
        email: trimmedEmail,
        role,
        token,
        expiresAt,
        invitedBy: (session.user as any).id,
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

    // Send invitation email with Accept button going to /login?invite=token
    try {
      const inviteUrl = `${process.env.NEXTAUTH_URL}/login?invite=${token}`;
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@getlinkai.com',
        to: trimmedEmail,
        subject: `You've been invited to join Link AI`,
        react: InvitationEmail({
          invitedByName: invitation.invitedByUser.name || 'Admin',
          invitedByEmail: invitation.invitedByUser.email || '',
          role: role,
          inviteUrl: inviteUrl,
          expiresAt: expiresAt,
        }),
      });

      console.log(`Invitation email sent successfully to ${trimmedEmail}`);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      
      // Delete the invitation if email failed to send
      await (prisma as any).invitation.delete({
        where: { id: invitation.id },
      });
      
      return NextResponse.json(
        { error: 'Failed to send invitation email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    if (status !== 'all') {
      where.status = status;
    }

    // Fetch invitations
    const [invitations, total] = await Promise.all([
      (prisma as any).invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          invitedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      (prisma as any).invitation.count({ where }),
    ]);

    return NextResponse.json({
      invitations,
      total,
      hasMore: offset + limit < total,
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 