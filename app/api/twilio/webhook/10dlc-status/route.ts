import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import twilio from 'twilio';

// Helper function to process brand approval
async function handleBrandApproval(brandSid: string) {
  try {
    console.log('[10DLC Webhook] Processing brand approval for:', brandSid);
    
    // Find user by brand SID
    const user = await prisma.user.findFirst({
      where: { a2pBrandSid: brandSid } as any
    });
    
    if (!user) {
      console.error('[10DLC Webhook] User not found for brand:', brandSid);
      return;
    }
    
    // Find phone numbers that need campaign creation
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      where: {
        userId: user.id,
        a2pRegistrationStatus: 'pending',
        a2pCampaignSid: null
      } as any
    });
    
    if (phoneNumbers.length === 0) {
      console.log('[10DLC Webhook] No phone numbers need campaign creation');
      return;
    }
    
    // Create Twilio client
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID as string,
      process.env.TWILIO_AUTH_TOKEN as string
    );
    
    // Process each phone number
    for (const phoneNumber of phoneNumbers) {
      try {
        console.log('[10DLC Webhook] Creating campaign for phone number:', phoneNumber.phoneNumber);
        
        // Get or create messaging service
        let messagingServiceSid = (phoneNumber as any).messagingServiceSid;
        
        if (!messagingServiceSid) {
          // Create messaging service
          const service = await twilioClient.messaging.v1.services.create({
            friendlyName: `Service for ${phoneNumber.phoneNumber}`,
            inboundRequestUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook/sms`,
            inboundMethod: 'POST',
            usecase: 'mixed',
            stickySender: true
          });
          
          // Add phone number to service
          await twilioClient.messaging.v1
            .services(service.sid)
            .phoneNumbers.create({
              phoneNumberSid: phoneNumber.twilioSid
            });
          
          messagingServiceSid = service.sid;
          
          // Update phone number record
          await prisma.twilioPhoneNumber.update({
            where: { id: phoneNumber.id },
            data: { 
              ...({ messagingServiceSid: service.sid } as any)
            }
          });
        }
        
        // Create campaign
        const campaign = await (twilioClient.messaging.v1 as any).a2p.usAppToPerson.create({
          brandRegistrationSid: brandSid,
          messagingServiceSid: messagingServiceSid,
          description: 'AI agent for appointment reminders and customer notifications',
          messageSamples: [
            'Hi [Name], this is a reminder about your appointment tomorrow at 2:00 PM. Reply CONFIRM to confirm or CANCEL to cancel.',
            'Your order #12345 has been shipped and will arrive by Friday. Track your package: [link]',
            'Hi [Name], thank you for your recent purchase! How was your experience? Reply 1-5 to rate.',
            'Reminder: Your subscription renews in 3 days. Visit [link] to manage your subscription.',
            'Your appointment has been confirmed for [Date] at [Time]. We\'ll send you a reminder the day before.'
          ],
          usAppToPersonUsecase: 'MIXED',
          hasEmbeddedLinks: true,
          hasEmbeddedPhone: false
        });
        
        console.log('[10DLC Webhook] Campaign created:', campaign.sid);
        
        // Update phone number status to approved
        await prisma.twilioPhoneNumber.update({
          where: { id: phoneNumber.id },
          data: {
            ...({
              a2pRegistrationStatus: 'approved',
              a2pRegisteredAt: new Date(),
              a2pCampaignSid: campaign.sid
            } as any)
          }
        });
        
        console.log('[10DLC Webhook] Phone number approved:', phoneNumber.phoneNumber);
        
      } catch (error) {
        console.error('[10DLC Webhook] Error processing phone number:', phoneNumber.phoneNumber, error);
      }
    }
  } catch (error) {
    console.error('[10DLC Webhook] Error handling brand approval:', error);
  }
}

// POST /api/twilio/webhook/10dlc-status - Handle 10DLC status webhooks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('[10DLC Webhook] Received event:', JSON.stringify(body, null, 2));
    
    // Handle different event types
    if (Array.isArray(body)) {
      // Event Streams sends events as an array
      for (const event of body) {
        await processEvent(event);
      }
    } else {
      // Single event
      await processEvent(body);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[10DLC Webhook] Error processing webhook:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process webhook' 
    }, { status: 500 });
  }
}

async function processEvent(event: any) {
  const eventType = event.type;
  const eventData = event.data;
  
  console.log('[10DLC Webhook] Processing event type:', eventType);
  
  switch (eventType) {
    case 'com.twilio.messaging.compliance.brand-registration.brand-verified':
    case 'com.twilio.messaging.compliance.brand-registration.brand-vetted-verified':
      // Brand approved - create campaigns for pending phone numbers
      if (eventData.brandsid) {
        await handleBrandApproval(eventData.brandsid);
      }
      break;
      
    case 'com.twilio.messaging.compliance.brand-registration.brand-failure':
    case 'com.twilio.messaging.compliance.brand-registration.brand-unverified':
      // Brand failed - update phone numbers to requires_attention
      if (eventData.brandsid) {
        await handleBrandFailure(eventData.brandsid, eventData.brandregistrationerrors);
      }
      break;
      
    case 'com.twilio.messaging.compliance.campaign-registration.campaign-approved':
      // Campaign approved - phone number is ready
      if (eventData.campaignsid) {
        await handleCampaignApproval(eventData.campaignsid);
      }
      break;
      
    case 'com.twilio.messaging.compliance.campaign-registration.campaign-failure':
      // Campaign failed - update phone number status
      if (eventData.campaignsid) {
        await handleCampaignFailure(eventData.campaignsid);
      }
      break;
      
    default:
      console.log('[10DLC Webhook] Unhandled event type:', eventType);
  }
}

async function handleBrandFailure(brandSid: string, errors: any[]) {
  try {
    console.log('[10DLC Webhook] Processing brand failure for:', brandSid);
    
    // Find user by brand SID
    const user = await prisma.user.findFirst({
      where: { a2pBrandSid: brandSid } as any
    });
    
    if (!user) {
      console.error('[10DLC Webhook] User not found for brand:', brandSid);
      return;
    }
    
    // Format error message
    let errorMessage = 'Brand registration failed';
    if (errors && errors.length > 0) {
      const errorDescriptions = errors.map((e: any) => e.registrationerrordescription || e.errordescription).filter(Boolean);
      if (errorDescriptions.length > 0) {
        errorMessage = errorDescriptions.join('; ');
      }
    }
    
    // Update phone numbers to requires_attention
    await prisma.twilioPhoneNumber.updateMany({
      where: {
        userId: user.id,
        a2pRegistrationStatus: 'pending'
      } as any,
      data: {
        a2pRegistrationStatus: 'requires_attention',
        a2pRegistrationError: errorMessage
      } as any
    });
    
    console.log('[10DLC Webhook] Updated phone numbers to requires_attention');
  } catch (error) {
    console.error('[10DLC Webhook] Error handling brand failure:', error);
  }
}

async function handleCampaignApproval(campaignSid: string) {
  try {
    console.log('[10DLC Webhook] Processing campaign approval for:', campaignSid);
    
    // Find phone number by campaign SID
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: { a2pCampaignSid: campaignSid } as any
    });
    
    if (!phoneNumber) {
      console.error('[10DLC Webhook] Phone number not found for campaign:', campaignSid);
      return;
    }
    
    // Update phone number status to approved if not already
    const phoneNumberData = phoneNumber as any;
    if (phoneNumberData.a2pRegistrationStatus !== 'approved') {
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumber.id },
        data: {
          ...({
            a2pRegistrationStatus: 'approved',
            a2pRegisteredAt: new Date()
          } as any)
        }
      });
      
      console.log('[10DLC Webhook] Phone number approved:', phoneNumber.phoneNumber);
    }
  } catch (error) {
    console.error('[10DLC Webhook] Error handling campaign approval:', error);
  }
}

async function handleCampaignFailure(campaignSid: string) {
  try {
    console.log('[10DLC Webhook] Processing campaign failure for:', campaignSid);
    
    // Find phone number by campaign SID
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: { a2pCampaignSid: campaignSid } as any
    });
    
    if (!phoneNumber) {
      console.error('[10DLC Webhook] Phone number not found for campaign:', campaignSid);
      return;
    }
    
    // Update phone number status to requires_attention
    await prisma.twilioPhoneNumber.update({
      where: { id: phoneNumber.id },
      data: {
        ...({
          a2pRegistrationStatus: 'requires_attention',
          a2pRegistrationError: 'Campaign registration failed. Please review your campaign details.'
        } as any)
      }
    });
    
    console.log('[10DLC Webhook] Updated phone number to requires_attention');
  } catch (error) {
    console.error('[10DLC Webhook] Error handling campaign failure:', error);
  }
} 