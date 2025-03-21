import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  // Get the session to fetch the authenticated user
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Get all messages with unread status
    const unreadMessages = await prisma.message.findMany({
      where: {
        userId,
        read: false,
        threadId: { not: '' },
      },
      select: {
        id: true,
        threadId: true,
      },
    });
    
    // Group by threadId to get unique threads
    const threadMap = new Map();
    unreadMessages.forEach(msg => {
      if (!threadMap.has(msg.threadId)) {
        threadMap.set(msg.threadId, []);
      }
      threadMap.get(msg.threadId).push(msg.id);
    });
    
    const unreadThreads = Array.from(threadMap.entries()).map(([threadId, messageIds]) => ({
      threadId,
      messageCount: messageIds.length,
    }));

    console.log(`Found ${unreadThreads.length} unread threads with ${unreadMessages.length} total unread messages for user ${userId}`);
    
    return NextResponse.json({ 
      count: unreadThreads.length,
      totalMessages: unreadMessages.length,
      threads: unreadThreads
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch unread count',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
