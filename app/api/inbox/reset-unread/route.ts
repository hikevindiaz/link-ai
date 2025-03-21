import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  // Get the session to fetch the authenticated user
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { threadId } = await request.json();
    
    let result;
    
    if (threadId) {
      // Mark all messages in the specific thread as unread
      result = await prisma.message.updateMany({
        where: {
          threadId,
          userId: session.user.id,
        },
        data: {
          read: false,
        },
      });
      
      console.log(`Reset ${result.count} messages to unread in thread ${threadId}`);
    } else {
      // Mark all messages for this user as unread
      result = await prisma.message.updateMany({
        where: {
          userId: session.user.id,
          threadId: { not: '' },
        },
        data: {
          read: false,
        },
      });
      
      console.log(`Reset ${result.count} messages to unread for user ${session.user.id}`);
    }
    
    return NextResponse.json({ 
      success: true,
      count: result.count,
      threadId: threadId || 'all'
    });
  } catch (error) {
    console.error('Error resetting unread status:', error);
    return NextResponse.json({ 
      error: 'Failed to reset unread status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 