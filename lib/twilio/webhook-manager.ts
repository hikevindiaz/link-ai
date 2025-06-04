import twilio from 'twilio';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

export interface WebhookConfig {
  voiceUrl?: string;
  voiceMethod?: 'GET' | 'POST';
  voiceFallbackUrl?: string;
  smsUrl?: string;
  smsMethod?: 'GET' | 'POST';
  smsFallbackUrl?: string;
  statusCallbackUrl?: string;
}

export class TwilioWebhookManager {
  private client: twilio.Twilio;
  private baseUrl: string;
  
  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    this.client = twilio(accountSid, authToken);
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    
    // Ensure HTTPS in production
    if (process.env.NODE_ENV === 'production' && !this.baseUrl.startsWith('https://')) {
      this.baseUrl = this.baseUrl.replace('http://', 'https://');
    }
    
    logger.info('TwilioWebhookManager initialized', { baseUrl: this.baseUrl }, 'webhook-manager');
  }
  
  /**
   * Configure webhooks for a phone number when assigned to an agent
   */
  async configurePhoneNumberWebhooks(
    phoneNumber: string,
    agentId: string,
    capabilities: {
      voice: boolean;
      sms: boolean;
      whatsapp: boolean;
    }
  ): Promise<void> {
    try {
      logger.info('Configuring webhooks for phone number', { 
        phoneNumber, 
        agentId, 
        capabilities 
      }, 'webhook-manager');
      
      // Find the phone number in Twilio
      const phoneNumbers = await this.client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });
      
      if (phoneNumbers.length === 0) {
        throw new Error(`Phone number ${phoneNumber} not found in Twilio account`);
      }
      
      const twilioPhoneNumber = phoneNumbers[0];
      
      // Build webhook configuration
      const webhookConfig: any = {};
      
      // Configure voice webhooks if voice is enabled
      if (capabilities.voice) {
        webhookConfig.voiceUrl = `${this.baseUrl}/api/twilio/voice?agentId=${agentId}`;
        webhookConfig.voiceMethod = 'POST';
        webhookConfig.voiceFallbackUrl = `${this.baseUrl}/api/twilio/voice/fallback?agentId=${agentId}`;
        webhookConfig.voiceFallbackMethod = 'POST';
      }
      
      // Configure SMS webhooks if SMS is enabled
      if (capabilities.sms) {
        webhookConfig.smsUrl = `${this.baseUrl}/api/twilio/webhook`;
        webhookConfig.smsMethod = 'POST';
        webhookConfig.smsFallbackUrl = `${this.baseUrl}/api/twilio/webhook/fallback`;
        webhookConfig.smsFallbackMethod = 'POST';
      }
      
      // Add status callback for all message types
      webhookConfig.statusCallback = `${this.baseUrl}/api/twilio/status`;
      webhookConfig.statusCallbackMethod = 'POST';
      
      // Update the phone number configuration
      await this.client.incomingPhoneNumbers(twilioPhoneNumber.sid).update(webhookConfig);
      
      logger.info('Webhooks configured successfully', { 
        phoneNumber,
        sid: twilioPhoneNumber.sid,
        webhooks: webhookConfig 
      }, 'webhook-manager');
      
      // If WhatsApp is enabled, configure WhatsApp sandbox or number
      if (capabilities.whatsapp) {
        await this.configureWhatsAppWebhooks(phoneNumber, agentId);
      }
      
    } catch (error) {
      logger.error('Failed to configure webhooks', { 
        error: error.message,
        phoneNumber,
        agentId 
      }, 'webhook-manager');
      throw error;
    }
  }
  
  /**
   * Configure WhatsApp webhooks
   */
  private async configureWhatsAppWebhooks(phoneNumber: string, agentId: string): Promise<void> {
    try {
      // For WhatsApp, we need to check if this is a WhatsApp-enabled number
      // or if we're using the sandbox
      const whatsappNumber = phoneNumber.startsWith('whatsapp:') 
        ? phoneNumber 
        : `whatsapp:${phoneNumber}`;
      
      // List WhatsApp senders
      const senders = await this.client.messaging.services.list();
      
      for (const service of senders) {
        // Check if this service has our phone number
        const phoneNumbers = await this.client.messaging
          .services(service.sid)
          .phoneNumbers
          .list();
        
        const hasNumber = phoneNumbers.some(pn => 
          pn.phoneNumber === phoneNumber || 
          pn.phoneNumber === whatsappNumber
        );
        
        if (hasNumber) {
          // Update the messaging service webhook
          await this.client.messaging.services(service.sid).update({
            inboundRequestUrl: `${this.baseUrl}/api/twilio/webhook`,
            inboundMethod: 'POST',
            statusCallback: `${this.baseUrl}/api/twilio/status`,
            useInboundWebhookOnNumber: true
          });
          
          logger.info('WhatsApp webhook configured', { 
            serviceId: service.sid,
            phoneNumber 
          }, 'webhook-manager');
          break;
        }
      }
      
    } catch (error) {
      logger.warn('Could not configure WhatsApp webhooks', { 
        error: error.message,
        phoneNumber 
      }, 'webhook-manager');
      // Don't throw - WhatsApp might not be fully configured yet
    }
  }
  
  /**
   * Remove webhooks when a phone number is unassigned
   */
  async removePhoneNumberWebhooks(phoneNumber: string): Promise<void> {
    try {
      logger.info('Removing webhooks for phone number', { phoneNumber }, 'webhook-manager');
      
      const phoneNumbers = await this.client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });
      
      if (phoneNumbers.length === 0) {
        logger.warn('Phone number not found in Twilio', { phoneNumber }, 'webhook-manager');
        return;
      }
      
      const twilioPhoneNumber = phoneNumbers[0];
      
      // Clear all webhooks
      await this.client.incomingPhoneNumbers(twilioPhoneNumber.sid).update({
        voiceUrl: '',
        voiceMethod: 'POST',
        voiceFallbackUrl: '',
        smsUrl: '',
        smsMethod: 'POST',
        smsFallbackUrl: '',
        statusCallback: ''
      });
      
      logger.info('Webhooks removed successfully', { 
        phoneNumber,
        sid: twilioPhoneNumber.sid 
      }, 'webhook-manager');
      
    } catch (error) {
      logger.error('Failed to remove webhooks', { 
        error: error.message,
        phoneNumber 
      }, 'webhook-manager');
      throw error;
    }
  }
  
  /**
   * Verify webhook configuration
   */
  async verifyWebhookConfiguration(phoneNumber: string): Promise<WebhookConfig> {
    try {
      const phoneNumbers = await this.client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });
      
      if (phoneNumbers.length === 0) {
        throw new Error(`Phone number ${phoneNumber} not found`);
      }
      
      const twilioPhoneNumber = phoneNumbers[0];
      
      return {
        voiceUrl: twilioPhoneNumber.voiceUrl,
        voiceMethod: twilioPhoneNumber.voiceMethod as 'GET' | 'POST',
        voiceFallbackUrl: twilioPhoneNumber.voiceFallbackUrl,
        smsUrl: twilioPhoneNumber.smsUrl,
        smsMethod: twilioPhoneNumber.smsMethod as 'GET' | 'POST',
        smsFallbackUrl: twilioPhoneNumber.smsFallbackUrl,
        statusCallbackUrl: twilioPhoneNumber.statusCallback
      };
      
    } catch (error) {
      logger.error('Failed to verify webhook configuration', { 
        error: error.message,
        phoneNumber 
      }, 'webhook-manager');
      throw error;
    }
  }
  
  /**
   * Update webhooks for all phone numbers assigned to an agent
   */
  async updateAllAgentWebhooks(agentId: string): Promise<void> {
    try {
      // Get all phone numbers assigned to this agent
      const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
        where: { chatbotId: agentId },
        include: { chatbot: true }
      });
      
      logger.info(`Updating webhooks for ${phoneNumbers.length} phone numbers`, { 
        agentId 
      }, 'webhook-manager');
      
      // Update each phone number
      for (const phoneRecord of phoneNumbers) {
        try {
          // Access fields safely
          const phoneWhatsAppEnabled = (phoneRecord as any).whatsappEnabled || false;
          const chatbotWhatsAppEnabled = phoneRecord.chatbot.whatsappEnabled || false;
          const hasWhatsApp = chatbotWhatsAppEnabled && phoneWhatsAppEnabled;
          
          await this.configurePhoneNumberWebhooks(
            phoneRecord.phoneNumber,
            agentId,
            {
              voice: true, // Phone numbers always support voice
              sms: phoneRecord.chatbot.smsEnabled,
              whatsapp: hasWhatsApp
            }
          );
        } catch (error) {
          logger.error('Failed to update webhook for phone number', { 
            error: error.message,
            phoneNumber: phoneRecord.phoneNumber,
            agentId 
          }, 'webhook-manager');
          // Continue with other numbers
        }
      }
      
    } catch (error) {
      logger.error('Failed to update agent webhooks', { 
        error: error.message,
        agentId 
      }, 'webhook-manager');
      throw error;
    }
  }
} 