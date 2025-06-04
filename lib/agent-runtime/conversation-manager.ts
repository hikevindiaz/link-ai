import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { 
  AgentMessage, 
  ChannelContext, 
  ConversationState 
} from './types';

export class ConversationManager {
  private conversations: Map<string, ConversationState> = new Map();
  
  /**
   * Get or create a conversation for a session
   */
  async getOrCreateConversation(
    sessionId: string,
    context: ChannelContext
  ): Promise<ConversationState> {
    // Check in-memory cache first
    let conversation = this.conversations.get(sessionId);
    
    if (!conversation) {
      // Load from database
      const messages = await this.loadMessagesFromDB(context.threadId, context.chatbotId);
      
      conversation = {
        messages,
        metadata: {
          channelType: context.type,
          userId: context.userId,
          chatbotId: context.chatbotId,
          startTime: new Date()
        }
      };
      
      this.conversations.set(sessionId, conversation);
      logger.info('Created new conversation', { sessionId, threadId: context.threadId }, 'conversation-manager');
    }
    
    return conversation;
  }
  
  /**
   * Get existing conversation
   */
  async getConversation(sessionId: string): Promise<ConversationState | null> {
    return this.conversations.get(sessionId) || null;
  }
  
  /**
   * Load messages from database using the existing Message model
   */
  private async loadMessagesFromDB(threadId: string, chatbotId: string): Promise<AgentMessage[]> {
    try {
      const dbMessages = await prisma.message.findMany({
        where: { 
          threadId,
          chatbotId 
        },
        orderBy: { createdAt: 'asc' },
        take: 50 // Limit to recent messages for performance
      });
      
      // Convert database messages to our format
      const messages: AgentMessage[] = [];
      
      dbMessages.forEach(msg => {
        // Add user message
        if (msg.message && msg.message.trim()) {
          messages.push({
            id: `user_${msg.id}`,
            role: 'user',
            content: msg.message,
            type: 'text',
            timestamp: msg.createdAt
          });
        }
        
        // Add assistant response
        if (msg.response && msg.response.trim()) {
          messages.push({
            id: `assistant_${msg.id}`,
            role: 'assistant',
            content: msg.response,
            type: 'text',
            timestamp: new Date(msg.createdAt.getTime() + 1000) // Slightly after user message
          });
        }
      });
      
      logger.info(`Loaded ${messages.length} messages from database`, { threadId }, 'conversation-manager');
      return messages;
      
    } catch (error) {
      logger.error('Error loading messages from database', { 
        error: error.message, 
        threadId 
      }, 'conversation-manager');
      return [];
    }
  }
  
  /**
   * Save a message to the database using the existing Message model structure
   */
  async saveMessage(message: AgentMessage, context: ChannelContext): Promise<void> {
    try {
      // The existing Message model expects both message and response in one record
      // We'll need to handle this differently based on the role
      
      if (message.role === 'user') {
        // For user messages, create a new record with empty response (will be updated later)
        await prisma.message.create({
          data: {
            message: message.content,
            response: '', // Will be updated when assistant responds
            threadId: context.threadId,
            from: context.phoneNumber || context.metadata?.whatsappUserId || 'user',
            userId: context.userId,
            chatbotId: context.chatbotId,
            userIP: context.metadata?.userIP
          }
        });
      } else if (message.role === 'assistant') {
        // For assistant messages, update the most recent user message with the response
        const lastUserMessage = await prisma.message.findFirst({
          where: {
            threadId: context.threadId,
            chatbotId: context.chatbotId,
            response: '' // Find message without response
          },
          orderBy: { createdAt: 'desc' }
        });
        
        if (lastUserMessage) {
          await prisma.message.update({
            where: { id: lastUserMessage.id },
            data: { response: message.content }
          });
        } else {
          // If no pending message, create a new one (edge case)
          await prisma.message.create({
            data: {
              message: '[System]',
              response: message.content,
              threadId: context.threadId,
              from: 'assistant',
              userId: context.userId,
              chatbotId: context.chatbotId
            }
          });
        }
      }
      
      logger.debug('Saved message to database', { 
        role: message.role, 
        threadId: context.threadId 
      }, 'conversation-manager');
      
    } catch (error) {
      logger.error('Error saving message to database', { 
        error: error.message, 
        threadId: context.threadId 
      }, 'conversation-manager');
      // Don't throw - we don't want to break the conversation flow
    }
  }
  
  /**
   * Clear conversation from memory (not from database)
   */
  clearConversation(sessionId: string): void {
    this.conversations.delete(sessionId);
    logger.debug('Cleared conversation from memory', { sessionId }, 'conversation-manager');
  }
  
  /**
   * Update conversation state
   */
  updateConversationState(sessionId: string, updates: Partial<ConversationState>): void {
    const conversation = this.conversations.get(sessionId);
    if (conversation) {
      Object.assign(conversation, updates);
    }
  }
  
  /**
   * Get conversation summary for a thread
   */
  async getConversationSummary(threadId: string): Promise<string | null> {
    try {
      const summary = await prisma.conversationSummary.findUnique({
        where: { threadId }
      });
      return summary?.summary || null;
    } catch (error) {
      logger.error('Error getting conversation summary', { 
        error: error.message, 
        threadId 
      }, 'conversation-manager');
      return null;
    }
  }
  
  /**
   * Save conversation summary
   */
  async saveConversationSummary(
    threadId: string, 
    title: string, 
    summary: string, 
    userId: string
  ): Promise<void> {
    try {
      await prisma.conversationSummary.upsert({
        where: { threadId },
        create: {
          threadId,
          title,
          summary,
          userId
        },
        update: {
          title,
          summary
        }
      });
      
      logger.info('Saved conversation summary', { threadId }, 'conversation-manager');
    } catch (error) {
      logger.error('Error saving conversation summary', { 
        error: error.message, 
        threadId 
      }, 'conversation-manager');
    }
  }
} 