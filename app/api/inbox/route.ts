import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  // Ensure the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract the agentId from the query string if it exists
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  
  try {
    // Build the query to fetch messages
    const query: any = {
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    };
    
    // If an agentId is provided, filter by that chatbotId
    if (agentId && agentId !== "all") {
      query.where.chatbotId = agentId;
    }
    
    // Get all unique threadIds for the user
    const threads = await prisma.message.groupBy({
      by: ['threadId'],
      where: query.where,
      orderBy: {
        _max: {
          createdAt: 'desc',
        },
      },
    });
    
    // For each thread, get the most recent message to use as a preview
    const conversations = await Promise.all(
      threads.map(async (thread) => {
        // Get the most recent message for this thread
        const latestMessage = await prisma.message.findFirst({
          where: {
            threadId: thread.threadId,
            userId: session.user.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        
        if (!latestMessage) return null;
        
        // Get the chatbot name for this thread
        const chatbot = await prisma.chatbot.findUnique({
          where: {
            id: latestMessage.chatbotId,
          },
          select: {
            name: true,
          },
        });
        
        // Check if there are any unread messages in this thread
        const unreadCount = await prisma.message.count({
          where: {
            threadId: thread.threadId,
            userId: session.user.id,
            read: false,
          },
        });
        
        return {
          id: thread.threadId,
          title: latestMessage.message.slice(0, 50) || "New Conversation",
          subtitle: latestMessage.response.slice(0, 100) || "No response yet",
          updatedAt: latestMessage.createdAt,
          chatbotName: chatbot?.name || "Agent",
          unread: unreadCount > 0,
        };
      })
    );
    
    // Filter out any null values and sort by updatedAt
    const validConversations = conversations
      .filter(Boolean)
      .sort((a, b) => new Date(b!.updatedAt).getTime() - new Date(a!.updatedAt).getTime());
    
    return NextResponse.json(validConversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ 
      error: "Failed to fetch conversations",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 