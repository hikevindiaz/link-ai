import { BaseChannelAdapter } from './base-adapter';
import { ChannelContext, AgentMessage } from '../types';
import { logger } from '@/lib/logger';
import twilio from 'twilio';

interface SMSIncomingData {
  Body: string;
  From: string;
  To: string;
  MessageSid: string;
}

export class SMSAdapter extends BaseChannelAdapter {
  type: ChannelContext['type'] = 'sms';
  private twilioClient: twilio.Twilio | null = null;
  
  async initialize(agent: any): Promise<void> {
    await super.initialize(agent);
    
    // Initialize Twilio client if credentials are available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }
  
  async handleIncoming(data: SMSIncomingData, context: ChannelContext): Promise<AgentMessage> {
    this.validateInitialized();
    
    // Validate message length for SMS
    const maxLength = context.capabilities.maxMessageLength || 160;
    if (data.Body.length > maxLength * 3) { // Allow up to 3 concatenated messages
      throw new Error(`SMS message too long (max ${maxLength * 3} characters)`);
    }
    
    // Create user message
    const message: AgentMessage = {
      id: `sms_${data.MessageSid}`,
      role: 'user',
      content: data.Body,
      type: 'text',
      timestamp: new Date(),
      metadata: {
        from: data.From,
        to: data.To,
        messageSid: data.MessageSid
      }
    };
    
    logger.info('SMS message received', { 
      from: data.From,
      messageLength: data.Body.length 
    }, 'sms-adapter');
    
    return message;
  }
  
  async sendOutgoing(message: AgentMessage, context: ChannelContext): Promise<void> {
    this.validateInitialized();
    
    if (!this.twilioClient) {
      logger.error('Twilio client not initialized', {}, 'sms-adapter');
      throw new Error('SMS sending not configured');
    }
    
    const phoneNumber = context.metadata?.phoneNumber || context.phoneNumber;
    if (!phoneNumber) {
      throw new Error('No phone number available for SMS message');
    }
    
    // Get the agent's phone number from context or database
    const fromNumber = context.metadata?.agentPhoneNumber || process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      throw new Error('No SMS phone number configured for agent');
    }
    
    try {
      // Split long messages into multiple SMS
      const messages = this.splitMessage(message.content, 160);
      
      for (const [index, msgPart] of messages.entries()) {
        const twilioMessage = await this.twilioClient.messages.create({
          body: messages.length > 1 ? `(${index + 1}/${messages.length}) ${msgPart}` : msgPart,
          from: fromNumber,
          to: phoneNumber
        });
        
        logger.debug('SMS part sent', { 
          messageSid: twilioMessage.sid,
          part: index + 1,
          total: messages.length 
        }, 'sms-adapter');
      }
      
      logger.info('SMS message sent', { 
        to: phoneNumber,
        parts: messages.length 
      }, 'sms-adapter');
      
    } catch (error) {
      logger.error('Failed to send SMS message', { 
        error: error.message,
        to: phoneNumber 
      }, 'sms-adapter');
      throw error;
    }
  }
  
  async handleEvent(event: any, context: ChannelContext): Promise<void> {
    await super.handleEvent?.(event, context);
    
    switch (event.type) {
      case 'delivered':
        logger.debug('SMS delivered', { 
          messageSid: event.MessageSid 
        }, 'sms-adapter');
        break;
        
      case 'failed':
        logger.error('SMS failed', { 
          messageSid: event.MessageSid,
          errorCode: event.ErrorCode,
          errorMessage: event.ErrorMessage 
        }, 'sms-adapter');
        break;
        
      default:
        logger.debug('Unhandled SMS event', { 
          eventType: event.type 
        }, 'sms-adapter');
    }
  }
  
  /**
   * Split a long message into SMS-sized chunks
   */
  private splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }
    
    const messages: string[] = [];
    const words = text.split(' ');
    let currentMessage = '';
    
    for (const word of words) {
      if ((currentMessage + ' ' + word).trim().length <= maxLength - 10) { // Reserve space for part indicator
        currentMessage = (currentMessage + ' ' + word).trim();
      } else {
        if (currentMessage) {
          messages.push(currentMessage);
        }
        currentMessage = word;
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage);
    }
    
    return messages;
  }
} 