import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { twilio } from '@/lib/twilio';

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
    
    // Get the phone number and verify ownership
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        userId: userId,
      },
      include: {
        user: true,
        chatbot: true,
      },
    });
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }
    
    // Get proper webhook URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://dashboard.getlinkai.com';
    const webhookBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    
    const webhookUrls = {
      voiceUrl: phoneNumber.chatbotId 
        ? `${webhookBaseUrl}/api/twilio/voice?agentId=${phoneNumber.chatbotId}`
        : `${webhookBaseUrl}/api/twilio/voice`,
      smsUrl: phoneNumber.chatbotId
        ? `${webhookBaseUrl}/api/twilio/sms?agentId=${phoneNumber.chatbotId}`
        : `${webhookBaseUrl}/api/twilio/sms`,
      statusCallback: phoneNumber.chatbotId
        ? `${webhookBaseUrl}/api/twilio/status-callback?agentId=${phoneNumber.chatbotId}`
        : `${webhookBaseUrl}/api/twilio/status-callback`,
    };
    
    console.log(`[Fix Webhook] Updating webhooks for ${phoneNumber.phoneNumber}`);
    console.log(`[Fix Webhook] Voice URL: ${webhookUrls.voiceUrl}`);
    console.log(`[Fix Webhook] SMS URL: ${webhookUrls.smsUrl}`);
    
    try {
      // Try to update using main account credentials
      await twilio.incomingPhoneNumbers(phoneNumber.twilioSid).update({
        voiceUrl: webhookUrls.voiceUrl,
        voiceMethod: 'POST',
        smsUrl: webhookUrls.smsUrl,
        smsMethod: 'POST',
        statusCallback: webhookUrls.statusCallback,
        statusCallbackMethod: 'POST',
      });
      
      console.log(`[Fix Webhook] ✓ Successfully updated webhooks`);
      
      // Verify the update
      const updatedPhoneNumber = await twilio.incomingPhoneNumbers(phoneNumber.twilioSid).fetch();
      
      return NextResponse.json({
        success: true,
        message: 'Webhooks updated successfully',
        webhooks: {
          voiceUrl: updatedPhoneNumber.voiceUrl,
          smsUrl: updatedPhoneNumber.smsUrl,
          statusCallback: updatedPhoneNumber.statusCallback,
        }
      });
      
    } catch (twilioError: any) {
      console.error('[Fix Webhook] Error updating webhooks:', twilioError);
      
      if (twilioError.code === 20003 || twilioError.status === 401) {
        // Authentication error - likely a subaccount issue
        return NextResponse.json({
          error: 'Unable to update webhooks automatically. This phone number is in a subaccount. Please update the webhooks manually in your telephony provider console.',
          manualUpdate: true,
          suggestedWebhooks: webhookUrls
        }, { status: 400 });
      }
      
      return NextResponse.json({
        error: `Failed to update webhooks: ${twilioError.message}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error fixing webhooks:', error);
    return NextResponse.json({ error: 'Failed to fix webhooks' }, { status: 500 });
  }
} 