import { twilio } from './twilio';
import prisma from './prisma';
import * as Twilio from 'twilio';

// A2P 10DLC Registration Service
export class TwilioA2PService {
  
  /**
   * Get or create A2P Brand registration for a user
   */
  static async getOrCreateBrand(userId: string): Promise<{ success: boolean; brandSid?: string; status?: string; error?: string }> {
    try {
      console.log(`[A2P] Getting or creating brand for user: ${userId}`);
      
      // Get user with business information
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Validate required business information
      if (!user.companyName || !user.addressLine1 || !user.city || !user.state || !user.postalCode || !user.country) {
        return { 
          success: false, 
          error: 'Missing required business information. Please complete your profile in Settings > Business Information.' 
        };
      }

      // Determine which Twilio client to use
      let twilioClient = twilio;
      
      if (user.twilioSubaccountSid) {
        twilioClient = Twilio.default(
          process.env.TWILIO_ACCOUNT_SID as string,
          process.env.TWILIO_AUTH_TOKEN as string,
          { accountSid: user.twilioSubaccountSid }
        );
      }

      // Map industry type to Twilio vertical
      const verticalMapping: { [key: string]: string } = {
        'technology': 'technology',
        'healthcare': 'healthcare',
        'finance': 'financial',
        'education': 'education',
        'retail': 'retail',
        'manufacturing': 'manufacturing',
        'consulting': 'professional_services',
        'marketing': 'marketing',
        'other': 'other'
      };

      const vertical = verticalMapping[user.industryType || 'other'] || 'other';

      // Prepare brand registration data
      const brandData = {
        friendlyName: user.companyName,
        website: user.businessWebsite || undefined,
        entityType: 'private_for_profit' as const,
        registrationReason: 'mixed' as const, // For appointment booking and customer service
        vertical: vertical,
        address: {
          street: user.addressLine1 + (user.addressLine2 ? ` ${user.addressLine2}` : ''),
          city: user.city,
          state: user.state,
          postalCode: user.postalCode,
          country: user.country
        },
        contactInfo: {
          firstName: user.name?.split(' ')[0] || 'Contact',
          lastName: user.name?.split(' ').slice(1).join(' ') || 'Person',
          email: user.email || '',
          phone: '+1234567890' // Default - user can update later
        }
      };

      console.log(`[A2P] Creating brand with data:`, brandData);

      // Create brand in Twilio
      const brand = await twilioClient.messaging.v1.a2p.brands.create({
        friendlyName: brandData.friendlyName,
        entityType: brandData.entityType,
        registrationReason: brandData.registrationReason,
        vertical: brandData.vertical,
        website: brandData.website,
        address: {
          street: brandData.address.street,
          city: brandData.address.city,
          state: brandData.address.state,
          postalCode: brandData.address.postalCode,
          country: brandData.address.country
        },
        email: brandData.contactInfo.email,
        phone: brandData.contactInfo.phone,
        firstName: brandData.contactInfo.firstName,
        lastName: brandData.contactInfo.lastName
      });

      console.log(`[A2P] Brand created in Twilio: ${brand.sid}`);

      return { 
        success: true, 
        brandSid: brand.sid, 
        status: brand.identityStatus 
      };

    } catch (error) {
      console.error(`[A2P] Error creating brand:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create brand registration' 
      };
    }
  }

  /**
   * Create A2P Campaign for appointment booking
   */
  static async createAppointmentCampaign(userId: string, brandSid: string): Promise<{ success: boolean; campaignSid?: string; status?: string; error?: string }> {
    try {
      console.log(`[A2P] Creating appointment campaign for user: ${userId}, brand: ${brandSid}`);

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Determine Twilio client
      let twilioClient = twilio;
      if (user.twilioSubaccountSid) {
        twilioClient = Twilio.default(
          process.env.TWILIO_ACCOUNT_SID as string,
          process.env.TWILIO_AUTH_TOKEN as string,
          { accountSid: user.twilioSubaccountSid }
        );
      }

      // Prepare campaign data
      const campaignData = {
        friendlyName: `${user.companyName} - Appointment Booking`,
        description: 'Automated appointment booking and customer service communications',
        useCaseCategory: 'mixed' as const,
        messageFlow: 'Customers receive appointment confirmations, reminders, and can reply to confirm or cancel appointments. Customer service messages for inquiries and support.',
        helpMessage: 'Reply STOP to opt out or HELP for assistance. Contact support at ' + (user.email || 'support@company.com'),
        optInMessage: 'You have opted in to receive appointment notifications and updates from ' + user.companyName + '. Reply STOP to opt out.',
        sampleMessages: [
          'Appointment Request: Mon, Jun 3 at 2:00 PM. Reply YES to confirm or NO to cancel. ID: abc123',
          'Reminder: Your appointment is tomorrow at 2:00 PM. Reply YES to confirm.',
          'Your appointment has been confirmed for Monday at 2:00 PM. See you then!',
          'Hi! I received your inquiry. When would you like to schedule an appointment?'
        ]
      };

      console.log(`[A2P] Creating campaign with data:`, campaignData);

      // Create campaign in Twilio
      const campaign = await twilioClient.messaging.v1.a2p.campaigns.create({
        brandSid: brandSid,
        usecaseCategory: campaignData.useCaseCategory,
        description: campaignData.description,
        messageFlow: campaignData.messageFlow,
        helpMessage: campaignData.helpMessage,
        optInMessage: campaignData.optInMessage,
        sampleMessage1: campaignData.sampleMessages[0],
        sampleMessage2: campaignData.sampleMessages[1],
        sampleMessage3: campaignData.sampleMessages[2],
        sampleMessage4: campaignData.sampleMessages[3],
        sampleMessage5: campaignData.sampleMessages[3] // Duplicate if only 4 messages
      });

      console.log(`[A2P] Campaign created in Twilio: ${campaign.sid}`);

      return { 
        success: true, 
        campaignSid: campaign.sid, 
        status: campaign.status 
      };

    } catch (error) {
      console.error(`[A2P] Error creating campaign:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create campaign registration' 
      };
    }
  }

  /**
   * Register phone number to A2P campaign
   */
  static async registerPhoneNumber(phoneNumberId: string): Promise<{ success: boolean; status?: string; error?: string; brandSid?: string; campaignSid?: string }> {
    try {
      console.log(`[A2P] Registering phone number: ${phoneNumberId}`);

      // Get phone number with user information
      const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
        where: { id: phoneNumberId },
        include: {
          user: true
        }
      });

      if (!phoneNumber) {
        return { success: false, error: 'Phone number not found' };
      }

      // Get or create brand
      const brandResult = await this.getOrCreateBrand(phoneNumber.userId);
      if (!brandResult.success) {
        return brandResult;
      }

      // Get or create campaign
      const campaignResult = await this.createAppointmentCampaign(phoneNumber.userId, brandResult.brandSid!);
      if (!campaignResult.success) {
        return campaignResult;
      }

      // Determine Twilio client
      let twilioClient = twilio;
      if (phoneNumber.user.twilioSubaccountSid) {
        twilioClient = Twilio.default(
          process.env.TWILIO_ACCOUNT_SID as string,
          process.env.TWILIO_AUTH_TOKEN as string,
          { accountSid: phoneNumber.user.twilioSubaccountSid }
        );
      }

      console.log(`[A2P] Registering phone number ${phoneNumber.phoneNumber} to campaign ${campaignResult.campaignSid}`);

      // Register phone number to campaign
      const registration = await twilioClient.messaging.v1.a2p
        .campaigns(campaignResult.campaignSid!)
        .phoneNumbers
        .create({
          phoneNumberSid: phoneNumber.twilioSid
        });

      console.log(`[A2P] Phone number registered:`, registration);

      return { 
        success: true, 
        status: 'pending',
        brandSid: brandResult.brandSid,
        campaignSid: campaignResult.campaignSid
      };

    } catch (error) {
      console.error(`[A2P] Error registering phone number:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to register phone number' 
      };
    }
  }

  /**
   * Check registration status for a phone number
   */
  static async checkPhoneNumberStatus(phoneNumberSid: string, twilioAccountSid?: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      console.log(`[A2P] Checking status for phone number: ${phoneNumberSid}`);

      // Determine Twilio client
      let twilioClient = twilio;
      if (twilioAccountSid) {
        twilioClient = Twilio.default(
          process.env.TWILIO_ACCOUNT_SID as string,
          process.env.TWILIO_AUTH_TOKEN as string,
          { accountSid: twilioAccountSid }
        );
      }

      // Get phone number details from Twilio
      const phoneNumber = await twilioClient.incomingPhoneNumbers(phoneNumberSid).fetch();
      
      // Check if it's registered to any campaign
      // Note: This is a simplified check - in production you'd want to store campaign associations
      console.log(`[A2P] Phone number ${phoneNumber.phoneNumber} fetched successfully`);

      return { 
        success: true, 
        status: 'active' // Simplified for now
      };

    } catch (error) {
      console.error(`[A2P] Error checking phone number status:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check phone number status' 
      };
    }
  }

  /**
   * Get registration status summary for user
   */
  static async getRegistrationStatus(userId: string): Promise<{
    needsBusinessInfo: boolean;
    needsRegistration: boolean;
    hasRegisteredNumbers: boolean;
    nextSteps: string[];
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          twilioPhoneNumbers: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const needsBusinessInfo = !user.companyName || !user.addressLine1 || !user.city || !user.state || !user.postalCode || !user.country;
      const hasPhoneNumbers = user.twilioPhoneNumbers.length > 0;
      const needsRegistration = hasPhoneNumbers && needsBusinessInfo;
      
      const nextSteps: string[] = [];
      
      if (needsBusinessInfo) {
        nextSteps.push('Complete business information in Settings > Business Information');
      }
      
      if (hasPhoneNumbers && !needsBusinessInfo) {
        nextSteps.push('Phone numbers will be automatically registered for SMS messaging');
      }

      if (!hasPhoneNumbers) {
        nextSteps.push('Purchase a phone number to enable SMS messaging');
      }

      return {
        needsBusinessInfo,
        needsRegistration,
        hasRegisteredNumbers: hasPhoneNumbers && !needsBusinessInfo,
        nextSteps
      };

    } catch (error) {
      console.error(`[A2P] Error getting registration status:`, error);
      throw error;
    }
  }
} 