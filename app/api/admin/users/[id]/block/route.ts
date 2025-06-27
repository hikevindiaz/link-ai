import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is admin
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { action } = await request.json();
    const userId = params.id;

    if (!action || !['block', 'unblock'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "block" or "unblock"' }, { status: 400 });
    }

    // Get the user to be blocked/unblocked
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true, role: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent blocking other admins
    if (targetUser.role === 'ADMIN' && action === 'block') {
      return NextResponse.json({ error: 'Cannot block admin users' }, { status: 400 });
    }

    // Prevent self-blocking
    if (targetUser.id === session.user.id && action === 'block') {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    let updatedUser;

    if (action === 'block') {
      // Block the user
      updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          status: 'BLOCKED',
          blockedAt: new Date(),
          blockedBy: session.user.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          blockedAt: true,
          role: true
        }
      });

      // Delete all active sessions for the blocked user to immediately log them out
      const deletedSessions = await db.session.deleteMany({
        where: { userId: userId }
      });
      
      console.log(`Deleted ${deletedSessions.count} active sessions for blocked user: ${targetUser.email}`);

    } else {
      // Unblock the user
      updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          blockedAt: null,
          blockedBy: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          blockedAt: true,
          role: true
        }
      });
    }

    return NextResponse.json({
      message: `User ${action}ed successfully`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 