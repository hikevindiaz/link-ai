import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';

// Verify Twilio webhook signature
const validateTwilioRequest = (req: NextRequest, body: FormData): boolean => {
  // In production, validate signature using Twilio's validateRequest function
  if (process.env.NODE_ENV === 'production') {
    try {
      const twilioSignature = req.headers.get('x-twilio-signature');
      const url = process.env.NEXT_PUBLIC_APP_URL + '/api/twilio/status-callback';
      
      if (!twilioSignature || !process.env.TWILIO_AUTH_TOKEN) {
        console.error('Missing Twilio signature or auth token');
        return false;
      }
      
      // Convert FormData to plain object for validation
      const params: Record<string, string> = {};
      body.forEach((value, key) => {
        params[key] = value.toString();
      });
      
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        params
      );
      
      if (!isValid) {
        console.error('Invalid Twilio signature');
      }
      
      return isValid;
    } catch (error) {
      console.error('Error validating Twilio request:', error);
      return false;
    }
  }
  
  // Skip validation in development
  return true;
};

// Twilio status callback endpoint for tracking call and SMS status updates
export async function POST(req: NextRequest) {
  console.log('[Status Callback] Twilio status callback received');
  
  try {
    // Parse the request body from Twilio (form data)
    const formData = await req.formData();
    
    // Validate the request is from Twilio
    if (!validateTwilioRequest(req, formData)) {
      console.error('[Status Callback] Invalid Twilio request');
      return NextResponse.json(
        { error: 'Unauthorized request' },
        { status: 403 }
      );
    }
    
    const twilioData: Record<string, string> = {};
    
    // Convert FormData to a plain object
    formData.forEach((value, key) => {
      twilioData[key] = value.toString();
    });
    
    console.log('[Status Callback] Received status data:', twilioData);
    
    // Extract relevant fields from the Twilio request
    const {
      CallSid: callSid,
      MessageSid: messageSid,
      CallStatus: callStatus,
      MessageStatus: messageStatus,
      From: from,
      To: to,
      Duration: duration,
      ErrorCode: errorCode,
      ErrorMessage: errorMessage
    } = twilioData;
    
    // Extract agentId from URL query parameters
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    
    if (!agentId) {
      console.log('[Status Callback] No agent ID provided in callback');
      return NextResponse.json({ success: true, message: 'No agent ID to track' });
    }
    
    // Handle call status updates
    if (callSid && callStatus) {
      console.log(`[Status Callback] Call status update: ${callSid} -> ${callStatus}`);
      
      try {
        // Log call status to database for analytics/debugging
        await prisma.message.create({
          data: {
            threadId: `call-${callSid}`,
            message: `Call status: ${callStatus}`,
            response: `Duration: ${duration || 'unknown'} seconds`,
            from: from || 'unknown',
            userId: agentId ? (await prisma.chatbot.findUnique({ where: { id: agentId } }))?.userId || '' : '',
            chatbotId: agentId,
          }
        });
        
        // Log specific call events
        if (callStatus === 'completed') {
          console.log(`[Status Callback] ✓ Call completed successfully: ${callSid} (Duration: ${duration}s)`);
        } else if (callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
          console.log(`[Status Callback] ❌ Call failed: ${callSid} (Status: ${callStatus}, Error: ${errorCode} - ${errorMessage})`);
        }
        
      } catch (dbError) {
        console.error('[Status Callback] Error saving call status to database:', dbError);
      }
    }
    
    // Handle SMS status updates
    if (messageSid && messageStatus) {
      console.log(`[Status Callback] SMS status update: ${messageSid} -> ${messageStatus}`);
      
      try {
        // Log SMS status to database for analytics/debugging
        await prisma.message.create({
          data: {
            threadId: `sms-status-${messageSid}`,
            message: `SMS status: ${messageStatus}`,
            response: errorMessage ? `Error: ${errorCode} - ${errorMessage}` : 'Status update',
            from: from || 'unknown',
            userId: agentId ? (await prisma.chatbot.findUnique({ where: { id: agentId } }))?.userId || '' : '',
            chatbotId: agentId,
          }
        });
        
        // Log specific SMS events
        if (messageStatus === 'delivered') {
          console.log(`[Status Callback] ✓ SMS delivered successfully: ${messageSid}`);
        } else if (messageStatus === 'failed' || messageStatus === 'undelivered') {
          console.log(`[Status Callback] ❌ SMS failed: ${messageSid} (Status: ${messageStatus}, Error: ${errorCode} - ${errorMessage})`);
        }
        
      } catch (dbError) {
        console.error('[Status Callback] Error saving SMS status to database:', dbError);
      }
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Status callback processed successfully'
    });
    
  } catch (error) {
    console.error('[Status Callback] Error processing status callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 