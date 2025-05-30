import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { twilio, getTwilioWebhookUrls } from '@/lib/twilio';

// The schema for the assignment request
const assignPhoneNumberSchema = z.object({
  agentId: z.string().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const phoneNumberId = params.id;
    
    // Parse and validate the request body
    const body = await req.json();
    const validatedData = assignPhoneNumberSchema.parse(body);
    
    // First, verify that the phone number belongs to the user and get user info for subaccount
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        userId: userId,
      },
      include: {
        user: true,
      },
    });
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }
    
    // If we're assigning to a chatbot, verify the chatbot belongs to the user
    if (validatedData.agentId) {
      const chatbot = await prisma.chatbot.findFirst({
        where: {
          id: validatedData.agentId,
          userId: userId,
        },
      });
      
      if (!chatbot) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      // Check if the agent already has a phone number
      const existingPhoneNumber = await prisma.twilioPhoneNumber.findFirst({
        where: {
          chatbotId: validatedData.agentId,
          id: { not: phoneNumberId }, // Exclude the current phone number
        },
      });
      
      if (existingPhoneNumber) {
        // Unassign the existing phone number
        await prisma.twilioPhoneNumber.update({
          where: { id: existingPhoneNumber.id },
          data: { chatbotId: null },
        });
      }
      
      // Configure the Twilio phone number with webhooks
      try {
        // Get the correct Twilio client - use subaccount if available
        let twilioClient = twilio;
        if (phoneNumber.user.twilioSubaccountSid) {
          console.log(`[Webhook Config] Using subaccount: ${phoneNumber.user.twilioSubaccountSid}`);
          twilioClient = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN,
            { accountSid: phoneNumber.user.twilioSubaccountSid }
          );
        } else {
          console.log(`[Webhook Config] Using main Twilio account`);
        }
        
        // Get webhook URLs with agent ID
        const baseWebhookUrls = getTwilioWebhookUrls(true); // Force production URLs
        const webhookUrls = {
          voiceUrl: `${baseWebhookUrls.voiceUrl}?agentId=${validatedData.agentId}`,
          smsUrl: `${baseWebhookUrls.smsUrl}?agentId=${validatedData.agentId}`,
        };
        
        console.log(`[Webhook Config] Configuring Twilio phone number ${phoneNumber.phoneNumber} with webhooks for agent ${validatedData.agentId}:`);
        console.log(`[Webhook Config] - Voice URL: ${webhookUrls.voiceUrl}`);
        console.log(`[Webhook Config] - SMS URL: ${webhookUrls.smsUrl}`);
        console.log(`[Webhook Config] - Twilio SID: ${phoneNumber.twilioSid}`);
        console.log(`[Webhook Config] - Using ${phoneNumber.user.twilioSubaccountSid ? 'subaccount' : 'main account'}`);
        
        // Update the Twilio phone number with the webhook URLs
        await twilioClient.incomingPhoneNumbers(phoneNumber.twilioSid).update({
          voiceUrl: webhookUrls.voiceUrl,
          voiceMethod: 'POST',
          smsUrl: webhookUrls.smsUrl,
          smsMethod: 'POST',
          statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status-callback?agentId=${validatedData.agentId}`,
          statusCallbackMethod: 'POST',
        });
        
        // Verify the configuration was applied
        try {
          const updatedPhoneNumber = await twilioClient.incomingPhoneNumbers(phoneNumber.twilioSid).fetch();
          console.log(`[Webhook Config] ✓ Verification - Voice URL set to: ${updatedPhoneNumber.voiceUrl}`);
          console.log(`[Webhook Config] ✓ Verification - SMS URL set to: ${updatedPhoneNumber.smsUrl}`);
        } catch (verifyError) {
          console.error('[Webhook Config] ⚠️  Could not verify webhook configuration:', verifyError);
        }
        
        console.log(`[Webhook Config] ✓ Successfully configured webhooks for phone number ${phoneNumber.phoneNumber}`);
        console.log(`[Webhook Config] ✓ Incoming calls will be handled by agent: ${validatedData.agentId}`);
        console.log(`[Webhook Config] ✓ SMS messages will be processed by agent: ${validatedData.agentId}`);
      } catch (twilioError) {
        console.error('[Webhook Config] ❌ Error updating Twilio phone number webhooks:', twilioError);
        // We'll still continue with the DB updates even if the webhook configuration fails
        // But we should log this as it means the phone number won't work properly
        console.error('[Webhook Config] ❌ Phone number may not receive calls/SMS properly due to webhook configuration failure');
      }
    } else {
      // If we're unassigning, reset the webhooks
      try {
        // Get the correct Twilio client - use subaccount if available
        let twilioClient = twilio;
        if (phoneNumber.user.twilioSubaccountSid) {
          console.log(`[Webhook Config] Using subaccount for reset: ${phoneNumber.user.twilioSubaccountSid}`);
          twilioClient = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN,
            { accountSid: phoneNumber.user.twilioSubaccountSid }
          );
        } else {
          console.log(`[Webhook Config] Using main Twilio account for reset`);
        }
        
        console.log(`[Webhook Config] Resetting webhooks for phone number ${phoneNumber.phoneNumber} (removing agent assignment)`);
        
        await twilioClient.incomingPhoneNumbers(phoneNumber.twilioSid).update({
          voiceUrl: '',
          smsUrl: '',
          statusCallback: '',
        });
        
        console.log(`[Webhook Config] ✓ Reset webhooks for phone number ${phoneNumber.phoneNumber}`);
        console.log(`[Webhook Config] ✓ Phone number will no longer receive calls/SMS until reassigned`);
      } catch (twilioError) {
        console.error('[Webhook Config] ❌ Error resetting Twilio phone number webhooks:', twilioError);
      }
    }
    
    // Update the phone number with the new chatbot assignment
    const updatedPhoneNumber = await prisma.twilioPhoneNumber.update({
      where: { id: phoneNumberId },
      data: { chatbotId: validatedData.agentId },
      include: { chatbot: true },
    });
    
    // Also update the chatbot's phone number field
    if (validatedData.agentId) {
      await prisma.chatbot.update({
        where: { id: validatedData.agentId },
        data: { phoneNumber: phoneNumber.phoneNumber },
      });
    }
    
    return NextResponse.json({
      success: true,
      phoneNumber: {
        id: updatedPhoneNumber.id,
        number: updatedPhoneNumber.phoneNumber,
        agentId: updatedPhoneNumber.chatbotId,
        agentName: updatedPhoneNumber.chatbot?.name || null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    
    console.error('Error assigning phone number to agent:', error);
    return NextResponse.json({ error: 'Failed to assign phone number' }, { status: 500 });
  }
} 