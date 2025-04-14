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
    const { agentId } = body;
    
    // Build the filter condition for updating messages
    const whereCondition: any = {
      userId: session.user.id,
      read: false,
    };
    
    // If an agentId is provided, add it to the filter
    if (agentId) {
      const threads = await prisma.message.groupBy({
        by: ['threadId'],
        where: {
          userId: session.user.id,
          chatbotId: agentId
        }
      });
      
      // If no threads found for this agent, return early
      if (threads.length === 0) {
        return NextResponse.json({ 
          success: true, 
          count: 0,
          message: "No unread messages found for this agent"
        });
      }
      
      // Add thread IDs to the filter
      whereCondition.threadId = {
        in: threads.map(thread => thread.threadId),
      };
    }
    
    // First, check how many unread messages there are
    const unreadCount = await prisma.message.count({
      where: whereCondition,
    });
    
    console.log(`Found ${unreadCount} unread messages to mark as read${agentId ? ` for agent ${agentId}` : ""}`);
    
    // If no unread messages, return early
    if (unreadCount === 0) {
      return NextResponse.json({ 
        success: true, 
        count: 0,
        message: "No unread messages found"
      });
    }
    
    // Mark all matching messages as read
    const updateResult = await prisma.message.updateMany({
      where: whereCondition,
      data: {
        read: true,
      },
    });
    
    console.log(`Marked ${updateResult.count} messages as read${agentId ? ` for agent ${agentId}` : ""}`);
    
    // Verify the update worked
    const remainingUnread = await prisma.message.count({
      where: {
        ...whereCondition,
        read: false, // This will be false regardless of the initial whereCondition
      },
    });
    
    console.log(`After update: ${remainingUnread} unread messages remain${agentId ? ` for agent ${agentId}` : ""}`);
    
    return NextResponse.json({ 
      success: true, 
      count: updateResult.count,
      initialUnreadCount: unreadCount,
      remainingUnread
    });
  } catch (error) {
    console.error("Error marking all messages as read:", error);
    return NextResponse.json({ 
      error: "Failed to mark all messages as read",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 