import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Message as AIMessage } from 'ai';

// Initialize Prisma client
const prisma = new PrismaClient();

// Get a thread/chat by ID (convert to format expected by chat interface)
export async function getChatById({ id }: { id: string }) {
  try {
    // Check if any messages exist for this thread
    const message = await prisma.message.findFirst({
      where: { threadId: id },
      orderBy: { createdAt: 'asc' },
    });

    if (!message) {
      return null;
    }

    // Get the chatbot for this thread
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: message.chatbotId },
    });

    // Return a "chat" object that matches the expected format
    return {
      id,
      createdAt: message.createdAt,
      title: `Chat with ${chatbot?.name || 'Assistant'}`,
      userId: message.userId,
      visibility: 'public', // Default to public since your system doesn't have this concept
    };
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

// Get all chats/threads by user ID
export async function getChatsByUserId({ id }: { id: string }) {
  try {
    // First get all unique threadIds for this user
    const threads = await prisma.message.findMany({
      where: { userId: id },
      select: { threadId: true, createdAt: true },
      distinct: ['threadId'],
      orderBy: { createdAt: 'desc' },
    });

    // Convert to the expected format
    return threads.map(thread => ({
      id: thread.threadId,
      createdAt: thread.createdAt,
      title: `Chat ${thread.threadId.slice(0, 8)}`,
      userId: id,
      visibility: 'public' as const,
    }));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

// Save a new chat/thread
export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    // For your schema, we don't need to create a chat record
    // as messages will be stored directly with the threadId
    // Just return success
    return { success: true };
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

// Delete a chat/thread by ID
export async function deleteChatById({ id }: { id: string }) {
  try {
    // Delete all messages for this thread
    await prisma.message.deleteMany({
      where: { threadId: id },
    });

    // Try to delete any votes if the table exists
    try {
      await prisma.$executeRaw`DELETE FROM "Vote" WHERE "threadId" = ${id}`;
    } catch (error) {
      console.log('Vote table may not exist yet', error);
    }

    // Try to delete any documents if the table exists
    try {
      await prisma.$executeRaw`DELETE FROM "Document" WHERE "threadId" = ${id}`;
    } catch (error) {
      console.log('Document table may not exist yet', error);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

// Get messages for a chat/thread
export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const messages = await prisma.message.findMany({
      where: { threadId: id },
      orderBy: { createdAt: 'asc' },
    });
    
    // Convert to the format expected by the chat interface
    return messages.map(msg => ({
      id: msg.id,
      chatId: msg.threadId,
      role: msg.from === 'user' ? 'user' : 'assistant',
      content: msg.from === 'user' ? msg.message : msg.response,
      createdAt: msg.createdAt,
    }));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

// Save messages to a chat/thread
export async function saveMessages({
  messages,
}: {
  messages: Array<{
    id: string;
    chatId: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}) {
  try {
    // Convert each message to your schema format and save
    for (const msg of messages) {
      await prisma.message.create({
        data: {
          id: msg.id,
          threadId: msg.chatId,
          message: msg.role === 'user' ? msg.content : '',
          response: msg.role === 'assistant' ? msg.content : '',
          from: msg.role,
          userId: process.env.DEFAULT_SYSTEM_USER_ID || 'system',
          chatbotId: process.env.DEFAULT_CHATBOT_ID || 'system',
          createdAt: msg.createdAt,
          read: false,
        },
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save messages in database');
    throw error;
  }
}

// Get votes for a chat/thread
export async function getVotesByChatId({ id }: { id: string }) {
  try {
    // Try to get votes from the Vote table
    try {
      const votes = await prisma.$queryRaw`
        SELECT * FROM "Vote" WHERE "threadId" = ${id}
      `;
      return votes;
    } catch (error) {
      console.log('Vote table may not exist yet', error);
      return [];
    }
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    return [];
  }
}

// Record a vote for a message
export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const value = type === 'up' ? 1 : -1;
    
    // Try to create a vote in the Vote table
    try {
      const voteId = uuidv4();
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Vote" (
          id TEXT PRIMARY KEY,
          "messageId" TEXT NOT NULL,
          "threadId" TEXT NOT NULL,
          value INTEGER NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await prisma.$executeRaw`
        INSERT INTO "Vote" (id, "messageId", "threadId", value, "createdAt")
        VALUES (${voteId}, ${messageId}, ${chatId}, ${value}, NOW())
        ON CONFLICT (id) DO UPDATE SET value = ${value}
      `;
      
      return { success: true };
    } catch (error) {
      console.error('Error with Vote table', error);
      return { success: false };
    }
  } catch (error) {
    console.error('Failed to vote message in database');
    throw error;
  }
}

// Get a message by ID
export async function getMessageById({ id }: { id: string }) {
  try {
    const message = await prisma.message.findUnique({
      where: { id },
    });
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    return [{
      id: message.id,
      chatId: message.threadId,
      role: message.from === 'user' ? 'user' : 'assistant',
      content: message.from === 'user' ? message.message : message.response,
      createdAt: message.createdAt,
    }];
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

// Delete messages from a chat after a specific timestamp
export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    // Find messages to delete
    const messagesToDelete = await prisma.message.findMany({
      where: {
        threadId: chatId,
        createdAt: { gte: timestamp },
      },
      select: { id: true },
    });
    
    const messageIds = messagesToDelete.map(message => message.id);
    
    if (messageIds.length > 0) {
      // Try to delete votes for these messages if the Vote table exists
      try {
        await prisma.$executeRaw`
          DELETE FROM "Vote" 
          WHERE "threadId" = ${chatId} 
          AND "messageId" IN (${messageIds.join(',')})
        `;
      } catch (error) {
        console.log('Vote table may not exist yet', error);
      }
      
      // Delete the messages
      await prisma.message.deleteMany({
        where: {
          threadId: chatId,
          id: { in: messageIds },
        },
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete messages by id after timestamp from database');
    throw error;
  }
}

// Update chat visibility (not applicable in your schema, but needed for compatibility)
export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    // This is a no-op in your schema since you don't have visibility
    return { success: true };
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
} 