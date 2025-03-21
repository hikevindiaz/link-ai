import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  // Ensure the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { threadId } = body;
    
    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    }
    
    // First, check if there are any unread messages in this thread
    const unreadCount = await prisma.message.count({
      where: {
        threadId,
        userId: session.user.id,
        read: false,
      },
    });
    
    console.log(`Found ${unreadCount} unread messages for thread ${threadId}`);
    
    // Mark all messages in the thread as read
    const updateResult = await prisma.message.updateMany({
      where: {
        threadId,
        userId: session.user.id,
        read: false,
      },
      data: {
        read: true,
      },
    });
    
    console.log(`Marked ${updateResult.count} messages as read for thread ${threadId}`);
    
    // Verify the update worked
    const remainingUnread = await prisma.message.count({
      where: {
        threadId,
        userId: session.user.id,
        read: false,
      },
    });
    
    console.log(`After update: ${remainingUnread} unread messages remain for thread ${threadId}`);
    
    return NextResponse.json({ 
      success: true, 
      count: updateResult.count,
      threadId,
      initialUnreadCount: unreadCount,
      remainingUnread
    });
  } catch (error) {
    console.error("Error marking thread as read:", error);
    return NextResponse.json({ 
      error: "Failed to mark thread as read",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 