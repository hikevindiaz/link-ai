import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';
import { logger } from '@/lib/logger';

// Verify Twilio webhook signature
const validateTwilioRequest = (req: NextRequest, body: FormData): boolean => {
  // In production, validate signature using Twilio's validateRequest function
  if (process.env.NODE_ENV === 'production') {
    try {
      const twilioSignature = req.headers.get('x-twilio-signature');
      const url = process.env.NEXT_PUBLIC_APP_URL + '/api/twilio/voice';
      
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

// Twilio webhook for handling incoming voice calls
export async function POST(req: NextRequest) {
  logger.info('Voice webhook called', {}, 'twilio-voice');
  
  try {
    // Parse the request body from Twilio (form data)
    const formData = await req.formData();
    
    // Validate the request is from Twilio
    if (!validateTwilioRequest(req, formData)) {
      logger.error('Invalid Twilio request', {}, 'twilio-voice');
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
    
    logger.debug('Received voice webhook data', twilioData, 'twilio-voice');
    
    // Extract relevant fields from the Twilio request
    const {
      From: from,
      To: to,
      CallSid: callSid
    } = twilioData;
    
    // Extract agentId from URL query parameters
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    
    // If no agent ID, try to look up by phone number
    let agent;
    
    if (agentId) {
      logger.info(`Looking up agent with ID: ${agentId}`, {}, 'twilio-voice');
      agent = await prisma.chatbot.findUnique({
        where: { id: agentId },
        include: {
          model: true,
        }
      });
    } else if (to) {
      logger.info(`No agent ID provided, looking up by phone number: ${to}`, {}, 'twilio-voice');
      // Look up the phone number in our database
      const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
        where: { phoneNumber: to },
        include: {
          chatbot: {
            include: {
              model: true,
            }
          }
        }
      });
      
      agent = phoneNumber?.chatbot;
    }
    
    if (!agent) {
      logger.error('No agent found for this call', { to, agentId }, 'twilio-voice');
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, this number is not configured to receive calls.');
      twiml.hangup();
      
      return new NextResponse(twiml.toString(), {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
    
    logger.info(`Call will be handled by agent: ${agent.name} (${agent.id})`, {}, 'twilio-voice');
    
    // Create a TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Start by pausing briefly to let the connection establish
    twiml.pause({ length: 1 });
    
    // Connect to Media Stream for real-time conversation
    const connect = twiml.connect();
    
    // Configure the media stream URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const streamUrl = `wss://${baseUrl.replace(/^https?:\/\//, '')}/api/twilio/media-stream?agentId=${agent.id}`;
    
    logger.info(`Connecting to media stream: ${streamUrl}`, {}, 'twilio-voice');
    
    // Add custom parameters to pass to the WebSocket
    const stream = connect.stream({
      url: streamUrl,
      track: 'both_tracks' // Get both inbound and outbound audio
    });
    
    // Pass custom parameters
    stream.parameter({
      name: 'from',
      value: from
    });
    
    stream.parameter({
      name: 'callSid',
      value: callSid
    });
    
    // Create a thread for this call
    try {
      const threadId = `call-${callSid}`;
      const existingThread = await prisma.message.findFirst({
        where: { threadId }
      });
      
      if (!existingThread) {
        // Create a new thread ID in the messages table with call metadata
        await prisma.message.create({
          data: {
            threadId,
            message: `Call started from ${from}`,
            response: '', // Will be filled in by the conversation
            from: from,
            userId: agent.userId,
            chatbotId: agent.id,
          }
        });
        
        logger.info(`Created thread ${threadId} for call from ${from}`, {}, 'twilio-voice');
      }
    } catch (dbError) {
      logger.error('Error creating call thread:', dbError, 'twilio-voice');
      // Continue with the call even if we couldn't create the thread
    }
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    logger.error('Error processing voice webhook:', error, 'twilio-voice');
    
    // Return a TwiML response with an error message
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, an error occurred processing your call.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
} 