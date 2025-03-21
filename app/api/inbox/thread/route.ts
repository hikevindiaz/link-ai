import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  // Extract the threadId from the query string
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");
  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
  }

  // Ensure the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch messages for the given threadId, sorted in ascending order
    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
    
    console.log(`Fetched ${messages.length} messages for thread ${threadId}`);
    
    // Try to mark messages as read, but handle the case where the field doesn't exist yet
    try {
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
      console.log(`Marked ${updateResult.count} messages as read`);
    } catch (updateError) {
      // If the update fails (likely because the Prisma client hasn't been regenerated),
      // log the error but continue with the request
      console.error("Error marking messages as read:", updateError);
      console.log("This is likely because the Prisma client needs to be regenerated with 'npx prisma generate'");
    }
    
    let welcomeMessage = "";
    if (messages.length > 0) {
      try {
        // Fetch the chatbot associated with the first message to get the welcome message
        const chatbot = await prisma.chatbot.findUnique({
          where: { id: messages[0].chatbotId },
          select: { welcomeMessage: true },
        });
        welcomeMessage = chatbot?.welcomeMessage || "";
      } catch (chatbotError) {
        console.error("Error fetching chatbot welcome message:", chatbotError);
      }
    }
    
    return NextResponse.json({ welcomeMessage, messages });
  } catch (error) {
    console.error("Error fetching thread messages:", error);
    return NextResponse.json({ 
      error: "Failed to fetch thread messages",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body to get threadId
    const body = await request.json();
    const { threadId } = body;

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    console.log(`Deleting thread ${threadId} for user ${session.user.id}`);

    // First, delete any associated summaries
    try {
      // Using raw SQL to handle potential issues with Prisma model
      await prisma.$executeRaw`
        DELETE FROM "conversationSummary" 
        WHERE "threadId" = ${threadId} AND "userId" = ${session.user.id}
      `;
      console.log('Associated summary deleted (if any)');
    } catch (summaryError) {
      console.error('Error deleting summary:', summaryError);
      // Continue with thread deletion even if summary deletion fails
    }

    // Delete all messages in the thread
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        threadId: threadId,
        userId: session.user.id,
      },
    });

    console.log(`Deleted ${deletedMessages.count} messages`);

    // Delete the thread itself
    // First check if the thread exists and belongs to the user
    const thread = await prisma.thread.findUnique({
      where: {
        id: threadId,
      },
    });

    if (!thread || thread.userId !== session.user.id) {
      return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 404 });
    }

    // Delete the thread
    const deletedThread = await prisma.thread.delete({
      where: {
        id: threadId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Thread and associated data deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting thread:', error);
    return NextResponse.json({ 
      error: 'Failed to delete thread', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}