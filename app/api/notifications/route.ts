import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get notifications from database
async function getNotificationsFromDB(userId: string, limit = 50) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  
  // Transform to match frontend format
  return notifications.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    actionUrl: n.actionUrl,
    metadata: n.metadata as Record<string, any> | undefined,
    timestamp: n.createdAt.toISOString()
  }));
}

async function markNotificationAsRead(notificationId: string, userId: string) {
  await prisma.notification.update({
    where: { 
      id: notificationId,
      userId // Ensure user owns this notification
    },
    data: { read: true }
  });
}

async function deleteNotification(notificationId: string, userId: string) {
  await prisma.notification.delete({
    where: { 
      id: notificationId,
      userId // Ensure user owns this notification
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    const notifications = await getNotificationsFromDB(session.user.id, limit);
    
    // Filter for unread only if requested
    const filteredNotifications = unreadOnly 
      ? notifications.filter(n => !n.read)
      : notifications;

    return NextResponse.json({
      notifications: filteredNotifications,
      unread_count: notifications.filter(n => !n.read).length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notification_id } = body;

    switch (action) {
      case 'mark_read':
        await markNotificationAsRead(notification_id, session.user.id);
        break;
      case 'mark_all_read':
        // Mark all notifications as read for this user
        await prisma.notification.updateMany({
          where: { userId: session.user.id, read: false },
          data: { read: true }
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    await deleteNotification(notificationId, session.user.id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
} 