import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import twilio from 'twilio';
import prisma from '@/lib/prisma';

/**
 * POST /api/twilio/status
 * Handle status callbacks from Twilio for calls and messages
 */
export async function POST(req: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await req.formData();
    const statusData: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      statusData[key] = value.toString();
    });
    
    logger.debug('Twilio status callback received', statusData, 'twilio-status');
    
    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const twilioSignature = req.headers.get('x-twilio-signature');
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`;
      
      if (!twilioSignature || !process.env.TWILIO_AUTH_TOKEN) {
        logger.error('Missing Twilio signature or auth token', {}, 'twilio-status');
        return new Response('Unauthorized', { status: 403 });
      }
      
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        statusData
      );
      
      if (!isValid) {
        logger.error('Invalid Twilio signature', {}, 'twilio-status');
        return new Response('Unauthorized', { status: 403 });
      }
    }
    
    // Handle different types of status callbacks
    if (statusData.CallSid) {
      await handleCallStatus(statusData);
    } else if (statusData.MessageSid) {
      await handleMessageStatus(statusData);
    } else {
      logger.warn('Unknown status callback type', statusData, 'twilio-status');
    }
    
    // Return empty 200 response as expected by Twilio
    return new Response('', { status: 200 });
    
  } catch (error) {
    logger.error('Error processing status callback', {
      error: error.message
    }, 'twilio-status');
    
    // Return 500 so Twilio will retry
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle call status updates
 */
async function handleCallStatus(data: Record<string, string>) {
  const {
    CallSid: callSid,
    CallStatus: status,
    CallDuration: duration,
    Direction: direction,
    From: from,
    To: to,
    ErrorCode: errorCode,
    ErrorMessage: errorMessage
  } = data;
  
  logger.info('Call status update', {
    callSid,
    status,
    duration,
    from,
    to
  }, 'twilio-status');
  
  // Store call status as an audit log
  try {
    // Find the agent associated with this call
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: { 
        phoneNumber: direction === 'inbound' ? to : from
      }
    });
    
    if (phoneNumber?.chatbotId) {
      // Store status update
      await prisma.message.create({
        data: {
          threadId: `call-${callSid}`,
          message: 'CALL_STATUS',
          response: JSON.stringify({
            type: 'call_status',
            status,
            duration: parseInt(duration || '0'),
            direction,
            from,
            to,
            errorCode,
            errorMessage,
            timestamp: new Date()
          }),
          from: 'system',
          userId: phoneNumber.userId,
          chatbotId: phoneNumber.chatbotId
        }
      });
      
      // If call completed, trigger analytics
      if (status === 'completed' && duration) {
        const durationSeconds = parseInt(duration);
        const durationMinutes = Math.ceil(durationSeconds / 60);
        
        // Record voice minute usage
        await prisma.usageRecord.create({
          data: {
            userId: phoneNumber.userId,
            usageType: 'voice_minute',
            quantity: durationMinutes,
            metadata: {
              callSid,
              phoneNumber: phoneNumber.phoneNumber,
              chatbotId: phoneNumber.chatbotId,
              duration: durationSeconds,
              direction
            },
            billingPeriodStart: new Date(new Date().setDate(1)), // First of current month
            billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) // Last of current month
          }
        });
      }
    }
    
  } catch (error) {
    logger.error('Failed to store call status', {
      error: error.message,
      callSid
    }, 'twilio-status');
  }
}

/**
 * Handle message status updates
 */
async function handleMessageStatus(data: Record<string, string>) {
  const {
    MessageSid: messageSid,
    MessageStatus: status,
    From: from,
    To: to,
    ErrorCode: errorCode,
    ErrorMessage: errorMessage,
    NumSegments: segments
  } = data;
  
  logger.info('Message status update', {
    messageSid,
    status,
    from,
    to,
    segments
  }, 'twilio-status');
  
  // Store message status
  try {
    // Determine if this is SMS or WhatsApp
    const isWhatsApp = from?.startsWith('whatsapp:') || to?.startsWith('whatsapp:');
    const cleanTo = to?.replace('whatsapp:', '');
    const cleanFrom = from?.replace('whatsapp:', '');
    
    // Find the agent associated with this message
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: { 
        phoneNumber: cleanTo
      }
    });
    
    if (phoneNumber?.chatbotId) {
      // Store status update
      await prisma.message.create({
        data: {
          threadId: `${isWhatsApp ? 'whatsapp' : 'sms'}-${cleanFrom}-status`,
          message: 'MESSAGE_STATUS',
          response: JSON.stringify({
            type: 'message_status',
            messageSid,
            status,
            channel: isWhatsApp ? 'whatsapp' : 'sms',
            from: cleanFrom,
            to: cleanTo,
            segments: parseInt(segments || '1'),
            errorCode,
            errorMessage,
            timestamp: new Date()
          }),
          from: 'system',
          userId: phoneNumber.userId,
          chatbotId: phoneNumber.chatbotId
        }
      });
      
      // Record SMS usage if delivered
      if (status === 'delivered' || status === 'sent') {
        const segmentCount = parseInt(segments || '1');
        
        await prisma.usageRecord.create({
          data: {
            userId: phoneNumber.userId,
            usageType: isWhatsApp ? 'whatsapp_message' : 'sms',
            quantity: segmentCount,
            metadata: {
              messageSid,
              phoneNumber: phoneNumber.phoneNumber,
              chatbotId: phoneNumber.chatbotId,
              to: cleanTo,
              from: cleanFrom,
              segments: segmentCount
            },
            billingPeriodStart: new Date(new Date().setDate(1)),
            billingPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          }
        });
      }
    }
    
  } catch (error) {
    logger.error('Failed to store message status', {
      error: error.message,
      messageSid
    }, 'twilio-status');
  }
} 