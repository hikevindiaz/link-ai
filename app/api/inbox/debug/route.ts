import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  // Get the session to fetch the authenticated user
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Get all messages for this user
    const allMessages = await prisma.message.findMany({
      where: {
        userId,
        threadId: { not: '' },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to the most recent 100 messages
    });
    
    console.log(`Found ${allMessages.length} messages for user ${userId}`);
    
    // Count total read and unread messages
    const readCount = allMessages.filter(msg => msg.read).length;
    const unreadCount = allMessages.filter(msg => !msg.read).length;
    
    console.log(`Total read messages: ${readCount}, unread messages: ${unreadCount}`);
    
    // Group messages by threadId
    const threadMap = new Map();
    allMessages.forEach(msg => {
      if (!threadMap.has(msg.threadId)) {
        threadMap.set(msg.threadId, []);
      }
      threadMap.get(msg.threadId).push(msg);
    });
    
    // Create thread summaries
    const threadSummaries = Array.from(threadMap.entries()).map(([threadId, messages]) => {
      const unreadInThread = messages.filter(msg => !msg.read).length;
      const totalInThread = messages.length;
      const newestMessage = messages.reduce((newest, msg) => 
        new Date(msg.createdAt) > new Date(newest.createdAt) ? msg : newest, messages[0]);
      const oldestMessage = messages.reduce((oldest, msg) => 
        new Date(msg.createdAt) < new Date(oldest.createdAt) ? msg : oldest, messages[0]);
      
      return {
        threadId,
        unreadCount: unreadInThread,
        totalCount: totalInThread,
        newestMessageTime: newestMessage.createdAt,
        oldestMessageTime: oldestMessage.createdAt,
        hasUnreadMessages: unreadInThread > 0,
        messages: messages.map(msg => ({
          id: msg.id,
          createdAt: msg.createdAt,
          read: msg.read,
          snippet: msg.message.substring(0, 30) + (msg.message.length > 30 ? '...' : '')
        }))
      };
    });
    
    return NextResponse.json({
      userId,
      totalMessages: allMessages.length,
      readMessages: readCount,
      unreadMessages: unreadCount,
      threadCount: threadMap.size,
      threadsWithUnread: threadSummaries.filter(t => t.hasUnreadMessages).length,
      threads: threadSummaries
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch debug information',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 