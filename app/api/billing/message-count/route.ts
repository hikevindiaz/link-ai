import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Count total messages for the user
    const messageCount = await prisma.message.count({
      where: {
        userId: userId
      }
    });

    // Each Message record represents one conversation turn (user message + bot response)
    // So total messages = messageCount * 2 (user + bot)
    const totalMessages = messageCount * 2;

    console.log(`[Message Count API] User: ${userId}`);
    console.log(`[Message Count API] Message records: ${messageCount}`);
    console.log(`[Message Count API] Total messages (user + bot): ${totalMessages}`);

    return NextResponse.json({
      success: true,
      messageCount: totalMessages,
      conversationTurns: messageCount,
      breakdown: {
        messageRecords: messageCount,
        totalMessages: totalMessages
      }
    });
  } catch (error) {
    console.error('Error getting message count:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get message count' },
      { status: 500 }
    );
  }
} 