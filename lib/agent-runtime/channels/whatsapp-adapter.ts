import { BaseChannelAdapter } from './base-adapter';
import { ChannelContext, AgentMessage } from '../types';
import { logger } from '@/lib/logger';
import twilio from 'twilio';

interface WhatsAppIncomingData {
  Body: string;
  From: string;
  To: string;
  MessageSid: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  NumMedia?: string;
}

export class WhatsAppAdapter extends BaseChannelAdapter {
  type: ChannelContext['type'] = 'whatsapp';
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
  
  async handleIncoming(data: WhatsAppIncomingData, context: ChannelContext): Promise<AgentMessage> {
    this.validateInitialized();
    
    // Extract media attachments if any
    const attachments = [];
    const numMedia = parseInt(data.NumMedia || '0');
    
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = data[`MediaUrl${i}` as keyof WhatsAppIncomingData];
      const mediaType = data[`MediaContentType${i}` as keyof WhatsAppIncomingData];
      
      if (mediaUrl && typeof mediaUrl === 'string') {
        attachments.push({
          type: mediaType?.toString().startsWith('image/') ? 'image' as const : 'file' as const,
          url: mediaUrl,
          name: `attachment_${i}`,
        });
      }
    }
    
    // Create user message
    const message: AgentMessage = {
      id: `whatsapp_${data.MessageSid}`,
      role: 'user',
      content: data.Body,
      type: 'text',
      timestamp: new Date(),
      metadata: {
        from: data.From,
        to: data.To,
        messageSid: data.MessageSid,
        attachments: attachments.length > 0 ? attachments : undefined
      }
    };
    
    logger.info('WhatsApp message received', { 
      from: data.From,
      hasMedia: numMedia > 0,
      messageLength: data.Body.length 
    }, 'whatsapp-adapter');
    
    return message;
  }
  
  async sendOutgoing(message: AgentMessage, context: ChannelContext): Promise<void> {
    this.validateInitialized();
    
    if (!this.twilioClient) {
      logger.error('Twilio client not initialized', {}, 'whatsapp-adapter');
      throw new Error('WhatsApp sending not configured');
    }
    
    const phoneNumber = context.metadata?.phoneNumber || context.phoneNumber;
    if (!phoneNumber) {
      throw new Error('No phone number available for WhatsApp message');
    }
    
    try {
      // Send message via Twilio WhatsApp API
      const twilioMessage = await this.twilioClient.messages.create({
        body: message.content,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phoneNumber}`
      });
      
      logger.info('WhatsApp message sent', { 
        messageSid: twilioMessage.sid,
        to: phoneNumber 
      }, 'whatsapp-adapter');
      
    } catch (error) {
      logger.error('Failed to send WhatsApp message', { 
        error: error.message,
        to: phoneNumber 
      }, 'whatsapp-adapter');
      throw error;
    }
  }
  
  async handleEvent(event: any, context: ChannelContext): Promise<void> {
    await super.handleEvent?.(event, context);
    
    switch (event.type) {
      case 'delivered':
        logger.debug('WhatsApp message delivered', { 
          messageSid: event.MessageSid 
        }, 'whatsapp-adapter');
        break;
        
      case 'read':
        logger.debug('WhatsApp message read', { 
          messageSid: event.MessageSid 
        }, 'whatsapp-adapter');
        break;
        
      case 'failed':
        logger.error('WhatsApp message failed', { 
          messageSid: event.MessageSid,
          errorCode: event.ErrorCode,
          errorMessage: event.ErrorMessage 
        }, 'whatsapp-adapter');
        break;
        
      default:
        logger.debug('Unhandled WhatsApp event', { 
          eventType: event.type 
        }, 'whatsapp-adapter');
    }
  }
} 