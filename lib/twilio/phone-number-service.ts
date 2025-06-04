import { TwilioWebhookManager } from './webhook-manager';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

export interface PhoneNumberAssignment {
  phoneNumberId: string;
  chatbotId: string;
  enableSms?: boolean;
  enableWhatsApp?: boolean;
}

export class PhoneNumberService {
  private webhookManager: TwilioWebhookManager;
  
  constructor() {
    this.webhookManager = new TwilioWebhookManager();
  }
  
  /**
   * Assign a phone number to a chatbot and configure webhooks
   */
  async assignPhoneNumber(assignment: PhoneNumberAssignment): Promise<void> {
    const { phoneNumberId, chatbotId, enableSms, enableWhatsApp } = assignment;
    
    try {
      logger.info('Assigning phone number to chatbot', { 
        phoneNumberId, 
        chatbotId 
      }, 'phone-service');
      
      // Get the phone number and chatbot
      const [phoneNumber, chatbot] = await Promise.all([
        prisma.twilioPhoneNumber.findUnique({
          where: { id: phoneNumberId }
        }),
        prisma.chatbot.findUnique({
          where: { id: chatbotId }
        })
      ]);
      
      if (!phoneNumber) {
        throw new Error('Phone number not found');
      }
      
      if (!chatbot) {
        throw new Error('Chatbot not found');
      }
      
      // Check if phone number is already assigned
      if (phoneNumber.chatbotId && phoneNumber.chatbotId !== chatbotId) {
        throw new Error('Phone number is already assigned to another chatbot');
      }
      
      // Start transaction
      await prisma.$transaction(async (tx) => {
        // Update phone number assignment
        const updateData: any = {
          chatbotId: chatbotId,
          updatedAt: new Date()
        };
        
        // Only update whatsappEnabled if explicitly requested
        if (enableWhatsApp !== undefined) {
          updateData.whatsappEnabled = enableWhatsApp;
        }
        
        await tx.twilioPhoneNumber.update({
          where: { id: phoneNumberId },
          data: updateData
        });
        
        // Update chatbot flags if needed
        const updates: any = {};
        if (enableSms && !chatbot.smsEnabled) {
          updates.smsEnabled = true;
        }
        if (enableWhatsApp && !chatbot.whatsappEnabled) {
          updates.whatsappEnabled = true;
        }
        
        if (Object.keys(updates).length > 0) {
          await tx.chatbot.update({
            where: { id: chatbotId },
            data: updates
          });
        }
        
        logger.info('Phone number assigned in database', { 
          phoneNumberId, 
          chatbotId 
        }, 'phone-service');
      });
      
      // Configure webhooks after successful database update
      try {
        // Access whatsappEnabled safely
        const phoneWhatsAppEnabled = (phoneNumber as any).whatsappEnabled || false;
        
        await this.webhookManager.configurePhoneNumberWebhooks(
          phoneNumber.phoneNumber,
          chatbotId,
          {
            voice: true, // Always enable voice for phone numbers
            sms: enableSms || chatbot.smsEnabled,
            whatsapp: (enableWhatsApp || chatbot.whatsappEnabled) && phoneWhatsAppEnabled
          }
        );
        
        logger.info('Webhooks configured successfully', { 
          phoneNumber: phoneNumber.phoneNumber,
          chatbotId 
        }, 'phone-service');
        
        // Create audit log
        await this.createAuditLog({
          action: 'phone_assigned',
          phoneNumberId,
          chatbotId,
          userId: chatbot.userId,
          metadata: {
            phoneNumber: phoneNumber.phoneNumber,
            capabilities: {
              voice: true,
              sms: enableSms || chatbot.smsEnabled,
              whatsapp: enableWhatsApp || chatbot.whatsappEnabled
            }
          }
        });
        
      } catch (webhookError) {
        logger.error('Failed to configure webhooks, rolling back', { 
          error: webhookError.message 
        }, 'phone-service');
        
        // Rollback database changes
        await prisma.twilioPhoneNumber.update({
          where: { id: phoneNumberId },
          data: {
            chatbotId: null,
            updatedAt: new Date()
          }
        });
        
        throw new Error(`Failed to configure webhooks: ${webhookError.message}`);
      }
      
    } catch (error) {
      logger.error('Failed to assign phone number', { 
        error: error.message,
        phoneNumberId,
        chatbotId 
      }, 'phone-service');
      throw error;
    }
  }
  
  /**
   * Unassign a phone number from a chatbot
   */
  async unassignPhoneNumber(phoneNumberId: string): Promise<void> {
    try {
      logger.info('Unassigning phone number', { phoneNumberId }, 'phone-service');
      
      // Get the phone number
      const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
        where: { id: phoneNumberId },
        include: { chatbot: true }
      });
      
      if (!phoneNumber) {
        throw new Error('Phone number not found');
      }
      
      if (!phoneNumber.chatbotId) {
        logger.warn('Phone number is not assigned', { phoneNumberId }, 'phone-service');
        return;
      }
      
      const previousChatbotId = phoneNumber.chatbotId;
      
      // Remove webhooks first
      try {
        await this.webhookManager.removePhoneNumberWebhooks(phoneNumber.phoneNumber);
        logger.info('Webhooks removed', { 
          phoneNumber: phoneNumber.phoneNumber 
        }, 'phone-service');
      } catch (webhookError) {
        logger.error('Failed to remove webhooks', { 
          error: webhookError.message 
        }, 'phone-service');
        // Continue with unassignment even if webhook removal fails
      }
      
      // Update database
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: {
          chatbotId: null,
          updatedAt: new Date()
        }
      });
      
      // Create audit log
      await this.createAuditLog({
        action: 'phone_unassigned',
        phoneNumberId,
        chatbotId: previousChatbotId,
        userId: phoneNumber.chatbot.userId,
        metadata: {
          phoneNumber: phoneNumber.phoneNumber
        }
      });
      
      logger.info('Phone number unassigned successfully', { 
        phoneNumberId,
        previousChatbotId 
      }, 'phone-service');
      
    } catch (error) {
      logger.error('Failed to unassign phone number', { 
        error: error.message,
        phoneNumberId 
      }, 'phone-service');
      throw error;
    }
  }
  
  /**
   * Update webhook configuration for a phone number
   */
  async updatePhoneNumberWebhooks(phoneNumberId: string): Promise<void> {
    try {
      const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
        where: { id: phoneNumberId },
        include: { chatbot: true }
      });
      
      if (!phoneNumber || !phoneNumber.chatbot) {
        throw new Error('Phone number or chatbot not found');
      }
      
      // Access whatsappEnabled safely
      const phoneWhatsAppEnabled = (phoneNumber as any).whatsappEnabled || false;
      
      await this.webhookManager.configurePhoneNumberWebhooks(
        phoneNumber.phoneNumber,
        phoneNumber.chatbotId!,
        {
          voice: true,
          sms: phoneNumber.chatbot.smsEnabled,
          whatsapp: phoneNumber.chatbot.whatsappEnabled && phoneWhatsAppEnabled
        }
      );
      
      logger.info('Webhooks updated', { 
        phoneNumberId,
        phoneNumber: phoneNumber.phoneNumber 
      }, 'phone-service');
      
    } catch (error) {
      logger.error('Failed to update webhooks', { 
        error: error.message,
        phoneNumberId 
      }, 'phone-service');
      throw error;
    }
  }
  
  /**
   * Batch update webhooks for all phone numbers
   */
  async updateAllWebhooks(): Promise<{
    success: number;
    failed: number;
    errors: Array<{ phoneNumber: string; error: string }>;
  }> {
    try {
      const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
        where: { 
          chatbotId: { not: null },
          status: 'active'
        },
        include: { chatbot: true }
      });
      
      logger.info(`Updating webhooks for ${phoneNumbers.length} phone numbers`, {}, 'phone-service');
      
      let success = 0;
      let failed = 0;
      const errors: Array<{ phoneNumber: string; error: string }> = [];
      
      for (const phoneRecord of phoneNumbers) {
        try {
          // Access whatsappEnabled safely
          const phoneWhatsAppEnabled = (phoneRecord as any).whatsappEnabled || false;
          
          await this.webhookManager.configurePhoneNumberWebhooks(
            phoneRecord.phoneNumber,
            phoneRecord.chatbotId!,
            {
              voice: true,
              sms: phoneRecord.chatbot!.smsEnabled,
              whatsapp: phoneRecord.chatbot!.whatsappEnabled && phoneWhatsAppEnabled
            }
          );
          success++;
        } catch (error) {
          failed++;
          errors.push({
            phoneNumber: phoneRecord.phoneNumber,
            error: error.message
          });
          logger.error('Failed to update webhook', { 
            phoneNumber: phoneRecord.phoneNumber,
            error: error.message 
          }, 'phone-service');
        }
      }
      
      logger.info('Batch webhook update complete', { 
        success, 
        failed 
      }, 'phone-service');
      
      return { success, failed, errors };
      
    } catch (error) {
      logger.error('Failed to batch update webhooks', { 
        error: error.message 
      }, 'phone-service');
      throw error;
    }
  }
  
  /**
   * Verify webhook configuration for a phone number
   */
  async verifyPhoneNumberWebhooks(phoneNumberId: string): Promise<{
    configured: boolean;
    webhooks: any;
    errors: string[];
  }> {
    try {
      const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
        where: { id: phoneNumberId },
        include: { chatbot: true }
      });
      
      if (!phoneNumber) {
        throw new Error('Phone number not found');
      }
      
      const webhooks = await this.webhookManager.verifyWebhookConfiguration(
        phoneNumber.phoneNumber
      );
      
      const errors: string[] = [];
      
      // Verify voice webhook if chatbot is assigned
      if (phoneNumber.chatbotId) {
        const expectedVoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice?agentId=${phoneNumber.chatbotId}`;
        if (!webhooks.voiceUrl || !webhooks.voiceUrl.includes(phoneNumber.chatbotId)) {
          errors.push('Voice webhook not properly configured');
        }
        
        // Verify SMS webhook if enabled
        if (phoneNumber.chatbot?.smsEnabled && !webhooks.smsUrl) {
          errors.push('SMS webhook not configured');
        }
      }
      
      return {
        configured: errors.length === 0,
        webhooks,
        errors
      };
      
    } catch (error) {
      logger.error('Failed to verify webhooks', { 
        error: error.message,
        phoneNumberId 
      }, 'phone-service');
      throw error;
    }
  }
  
  /**
   * Create audit log entry
   */
  private async createAuditLog(data: {
    action: string;
    phoneNumberId: string;
    chatbotId: string | null;
    userId: string;
    metadata?: any;
  }): Promise<void> {
    try {
      // Store audit log as a special message
      await prisma.message.create({
        data: {
          threadId: `audit_${Date.now()}`,
          message: 'AUDIT_LOG',
          response: JSON.stringify({
            type: 'phone_number_audit',
            action: data.action,
            phoneNumberId: data.phoneNumberId,
            chatbotId: data.chatbotId,
            timestamp: new Date(),
            metadata: data.metadata
          }),
          from: 'system',
          userId: data.userId,
          chatbotId: data.chatbotId || ''
        }
      });
    } catch (error) {
      logger.error('Failed to create audit log', { 
        error: error.message,
        data 
      }, 'phone-service');
      // Don't throw - audit log failure shouldn't break the operation
    }
  }
} 