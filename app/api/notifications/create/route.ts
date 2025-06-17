import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotificationService } from '@/lib/services/notificationService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, actionUrl, metadata } = body;

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      );
    }

    // Create notification based on type
    switch (type) {
      case 'appointment':
        await NotificationService.createAppointmentNotification(
          session.user.id,
          { ...metadata, customerName: metadata?.customerName || 'Unknown' }
        );
        break;
      
      case 'order':
        await NotificationService.createOrderNotification(
          session.user.id,
          { ...metadata, orderNumber: metadata?.orderNumber || Date.now().toString() }
        );
        break;
      
      case 'user':
        await NotificationService.createUserNotification(
          session.user.id,
          { ...metadata, name: metadata?.userName || 'New User' }
        );
        break;
      
      case 'system':
      default:
        await NotificationService.createSystemNotification(
          session.user.id,
          title,
          message,
          actionUrl
        );
        break;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
} 