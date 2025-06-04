import { BaseChannelAdapter } from './base-adapter';
import { ChannelContext, AgentMessage } from '../types';
import { logger } from '@/lib/logger';

interface WebChatIncomingData {
  message: string;
  attachments?: Array<{
    type: 'image' | 'file';
    url: string;
    name?: string;
    size?: number;
  }>;
  metadata?: Record<string, any>;
}

export class WebChatAdapter extends BaseChannelAdapter {
  type: ChannelContext['type'] = 'web';
  
  async handleIncoming(data: WebChatIncomingData, context: ChannelContext): Promise<AgentMessage> {
    this.validateInitialized();
    
    // Validate message length
    const maxLength = context.capabilities.maxMessageLength || 4000;
    if (data.message.length > maxLength) {
      throw new Error(`Message exceeds maximum length of ${maxLength} characters`);
    }
    
    // Create user message
    const message: AgentMessage = {
      id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: data.message,
      type: 'text',
      timestamp: new Date(),
      metadata: {
        ...data.metadata,
        attachments: data.attachments
      }
    };
    
    logger.debug('Web chat message received', { 
      messageLength: data.message.length,
      hasAttachments: !!data.attachments?.length 
    }, 'web-adapter');
    
    return message;
  }
  
  async sendOutgoing(message: AgentMessage, context: ChannelContext): Promise<void> {
    this.validateInitialized();
    
    // For web chat, the actual sending is handled by the API response
    // This method is more relevant for push-based channels
    logger.debug('Web chat message prepared for sending', { 
      messageId: message.id,
      contentLength: message.content.length 
    }, 'web-adapter');
    
    // If we need to handle typing indicators or other UI updates
    if (context.capabilities.supportsTypingIndicator) {
      await this.sendTypingIndicator(false, context);
    }
  }
  
  async handleEvent(event: any, context: ChannelContext): Promise<void> {
    await super.handleEvent?.(event, context);
    
    switch (event.type) {
      case 'typing_start':
        await this.sendTypingIndicator(true, context);
        break;
        
      case 'typing_stop':
        await this.sendTypingIndicator(false, context);
        break;
        
      case 'seen':
        logger.debug('Message seen by user', { 
          messageId: event.messageId 
        }, 'web-adapter');
        break;
        
      default:
        logger.debug('Unhandled web chat event', { 
          eventType: event.type 
        }, 'web-adapter');
    }
  }
  
  private async sendTypingIndicator(isTyping: boolean, context: ChannelContext): Promise<void> {
    // In a real implementation, this would send a typing indicator through
    // websocket or server-sent events to the client
    logger.debug('Typing indicator', { 
      isTyping,
      sessionId: context.sessionId 
    }, 'web-adapter');
  }
} 