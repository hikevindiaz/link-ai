import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Message as AIMessage } from 'ai';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create a default system user ID if not defined in environment variables
const DEFAULT_SYSTEM_USER_ID = process.env.DEFAULT_SYSTEM_USER_ID || 'system';

// Helper function to ensure a valid user exists for system messages
async function ensureSystemUserExists() {
  try {
    // Check if the system user already exists
    const systemUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: DEFAULT_SYSTEM_USER_ID },
          { email: 'system@example.com' }
        ]
      }
    });
    
    // If system user exists, return its ID
    if (systemUser) {
      return systemUser.id;
    }
    
    // Try to find any user to use as a fallback
    const anyUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    
    if (anyUser) {
      console.log(`Using existing user ${anyUser.id} for system messages`);
      return anyUser.id;
    }
    
    // If no users exist, create a minimal system user (this is a fallback)
    try {
      const newUser = await prisma.user.create({
        data: {
          id: DEFAULT_SYSTEM_USER_ID,
          name: 'System',
          email: 'system@example.com'
        }
      });
      return newUser.id;
    } catch (createError) {
      console.error(`Failed to create system user: ${createError}`);
      throw new Error('No valid user found and unable to create system user');
    }
  } catch (error) {
    console.error(`Error ensuring system user exists: ${error}`);
    throw error;
  }
}

// Get messages from a thread and convert to AI SDK format
export async function getThreadMessages(threadId: string): Promise<AIMessage[]> {
  try {
    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
    
    console.log(`[getThreadMessages] Found ${messages.length} messages for thread ${threadId}`);
    
    // Transform database messages to AI SDK format
    // Each record in our database contains both the user message and AI response
    // We need to split these into separate messages for the UI
    const aiMessages: AIMessage[] = [];
    
    for (const dbMessage of messages) {
      // Ensure each message has an ID
      const messageId = dbMessage.id || uuidv4();
      
      // Add user message first
      if (dbMessage.message) {
        aiMessages.push({
          id: `${messageId}-user`,
          role: 'user',
          content: dbMessage.message,
          createdAt: dbMessage.createdAt
        });
      }
      
      // Add assistant response if it exists
      if (dbMessage.response) {
        aiMessages.push({
          id: `${messageId}-assistant`,
          role: 'assistant', // Always use 'assistant' role for responses regardless of 'from' field
          content: dbMessage.response,
          createdAt: new Date(dbMessage.createdAt.getTime() + 1) // Ensure correct order
        });
      }
    }
    
    console.log(`[getThreadMessages] Transformed into ${aiMessages.length} AI messages`);
    aiMessages.forEach((msg, i) => {
      console.log(`[getThreadMessages] Message ${i}: role=${msg.role}, id=${msg.id} content=${msg.content.substring(0, 30)}...`);
    });
    
    return aiMessages;
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return [];
  }
}

/**
 * Store a user message in the database
 */
export async function storeUserMessage({
  threadId,
  content,
  chatbotId,
  userIP = '',
  from = 'user',
}: {
  threadId: string;
  content: string;
  chatbotId: string;
  userIP?: string;
  from?: string;
}) {
  try {
    // Ensure the threadId is properly formatted for inbox compatibility
    const formattedThreadId = threadId.startsWith('thread_') ? threadId : `thread_${threadId}`;
    
    // Get a valid user ID for storing the message
    const userId = await ensureSystemUserExists();
    
    // Create the message with proper inbox compatibility
    console.log(`Storing user message with data:`, {
      threadId: formattedThreadId,
      message: content,
      response: '', // Empty response until assistant replies
      from,
      userIP,
      userId,
      chatbotId
    });
    
    const message = await prisma.message.create({
      data: {
        threadId: formattedThreadId,
        message: content,
        response: '', // Empty response until assistant replies
        from: 'user', // Always store as 'user' for the sender
        userIP, // Store the user's IP address
        userId, // Use the valid user ID
        chatbotId,
        read: true,  // User's own messages are automatically read
      }
    });
    
    console.log(`✅ Stored user message in thread ${formattedThreadId} with ID ${message.id}`);
    
    return {
      id: message.id,
      threadId: formattedThreadId,
      role: 'user' as const,
      content,
      createdAt: message.createdAt
    };
  } catch (error) {
    console.error(`❌ Error in storeUserMessage: ${error}`);
    // Provide a fallback return value so the chat can continue
    return {
      id: uuidv4(),
      threadId,
      role: 'user' as const,
      content,
      createdAt: new Date()
    };
  }
}

/**
 * Store an assistant message in the database by updating the user message record
 */
export async function storeAssistantMessage({
  threadId,
  content,
  chatbotId,
  userIP = '',
  from = 'assistant',
}: {
  threadId: string;
  content: string;
  chatbotId: string;
  userIP?: string;
  from?: string;
}) {
  try {
    // Ensure the threadId is properly formatted for inbox compatibility
    const formattedThreadId = threadId.startsWith('thread_') ? threadId : `thread_${threadId}`;
    
    // Find the most recent user message with no response yet in this thread
    let existingMessage;
    try {
      existingMessage = await prisma.message.findFirst({
        where: { 
          threadId: formattedThreadId,
          response: ''  // Find message without a response
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error(`Error finding message to update: ${error}`);
    }
    
    // If we found a message to update, update it with the response
    if (existingMessage) {
      console.log(`Updating existing message ${existingMessage.id} with assistant response`);
      
      const updatedMessage = await prisma.message.update({
        where: { id: existingMessage.id },
        data: {
          response: content,
          read: false, // Mark as unread so it shows up in the inbox
          from: existingMessage.from, // Keep the original 'from' value
        }
      });
      
      console.log(`✅ Updated message with assistant response in thread ${formattedThreadId}`);
      
      return {
        id: updatedMessage.id,
        threadId: formattedThreadId,
        role: 'assistant' as const,
        content,
        createdAt: updatedMessage.createdAt
      };
    } else {
      // If no existing message found to update, create a new one as fallback
      console.log(`No existing message found to update, creating a standalone assistant message`);
      
      // Get a valid user ID for storing the message
      const userId = await ensureSystemUserExists();
      
      const message = await prisma.message.create({
        data: {
          threadId: formattedThreadId,
          message: '', // Empty message
          response: content, // Store assistant response
          from, // Use the provided 'from' value
          userIP, // Store the user's IP address
          userId, // Use the valid user ID
          chatbotId,
          read: false, // Mark as unread so it shows up in the inbox
        }
      });
      
      console.log(`✅ Created standalone assistant message in thread ${formattedThreadId}`);
      
      return {
        id: message.id,
        threadId: formattedThreadId,
        role: 'assistant' as const,
        content,
        createdAt: message.createdAt
      };
    }
  } catch (error) {
    console.error(`❌ Error in storeAssistantMessage: ${error}`);
    // Provide a fallback return value so the chat can continue
    return {
      id: uuidv4(),
      threadId,
      role: 'assistant' as const,
      content,
      createdAt: new Date()
    };
  }
}

// Create a vote for a message
export async function createVote({
  messageId,
  threadId,
  value
}: {
  messageId: string;
  threadId: string;
  value: 1 | -1; // 1 for upvote, -1 for downvote
}) {
  try {
    // Check if the Vote table exists - try/catch will handle if it doesn't
    try {
      // Using raw query to be safe in case the schema isn't synced
      const voteId = uuidv4();
      await prisma.$executeRaw`
        INSERT INTO "Vote" (id, "messageId", "threadId", value, "createdAt")
        VALUES (${voteId}, ${messageId}, ${threadId}, ${value}, NOW())
        ON CONFLICT DO NOTHING
      `;
      
      return { id: voteId, messageId, threadId, value };
    } catch (error) {
      console.error('Error with Vote table, trying to create it:', error);
      
      // Create the Vote table if it doesn't exist
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Vote" (
          id TEXT PRIMARY KEY,
          "messageId" TEXT NOT NULL,
          "threadId" TEXT NOT NULL,
          value INTEGER NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Try the insert again
      const voteId = uuidv4();
      await prisma.$executeRaw`
        INSERT INTO "Vote" (id, "messageId", "threadId", value, "createdAt")
        VALUES (${voteId}, ${messageId}, ${threadId}, ${value}, NOW())
      `;
      
      return { id: voteId, messageId, threadId, value };
    }
  } catch (error) {
    console.error('Error creating vote:', error);
    throw error;
  }
}

// Get votes for a thread
export async function getVotesForThread(threadId: string) {
  try {
    // Check if the Vote table exists
    try {
      const votes = await prisma.$queryRaw`
        SELECT * FROM "Vote" WHERE "threadId" = ${threadId}
      `;
      
      return votes;
    } catch (error) {
      console.error('Vote table may not exist yet:', error);
      return [];
    }
  } catch (error) {
    console.error('Error fetching votes:', error);
    return [];
  }
}

// Create a document for a thread
export async function createDocument({
  threadId,
  title,
  content,
  kind = 'text'
}: {
  threadId: string;
  title: string;
  content: string;
  kind?: 'text' | 'code' | 'image' | 'sheet';
}) {
  try {
    // Check if the Document table exists
    try {
      // Using raw query to be safe in case the schema isn't synced
      const documentId = uuidv4();
      await prisma.$executeRaw`
        INSERT INTO "Document" (id, "threadId", title, content, kind, "createdAt")
        VALUES (${documentId}, ${threadId}, ${title}, ${content}, ${kind}, NOW())
      `;
      
      return { 
        id: documentId, 
        threadId, 
        title, 
        content, 
        kind,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error with Document table, trying to create it:', error);
      
      // Create the Document table if it doesn't exist
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Document" (
          id TEXT PRIMARY KEY,
          "threadId" TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT,
          kind TEXT DEFAULT 'text',
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Try the insert again
      const documentId = uuidv4();
      await prisma.$executeRaw`
        INSERT INTO "Document" (id, "threadId", title, content, kind, "createdAt")
        VALUES (${documentId}, ${threadId}, ${title}, ${content}, ${kind}, NOW())
      `;
      
      return { 
        id: documentId, 
        threadId, 
        title, 
        content, 
        kind,
        createdAt: new Date()
      };
    }
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
}

// Get documents for a thread
export async function getDocumentsForThread(threadId: string) {
  try {
    // Check if the Document table exists
    try {
      const documents = await prisma.$queryRaw`
        SELECT * FROM "Document" WHERE "threadId" = ${threadId}
      `;
      
      return documents;
    } catch (error) {
      console.error('Document table may not exist yet:', error);
      return [];
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}