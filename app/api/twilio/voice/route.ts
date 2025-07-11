import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { db as prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { RoomServiceClient, AccessToken } from 'livekit-server-sdk';

// Environment variables
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const LIVEKIT_URL = process.env.LIVEKIT_URL!;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

// Initialize services
const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// Twilio webhook for handling incoming voice calls
export async function POST(req: NextRequest) {
  logger.info('📞 Incoming voice call webhook', {}, 'twilio-voice');
  
  try {
    // Parse the request body from Twilio (form data)
    const formData = await req.formData();
    
    // Extract Twilio data
    const twilioData: Record<string, string> = {};
    formData.forEach((value, key) => {
      twilioData[key] = value.toString();
    });
    
    const { CallSid, From, To } = twilioData;
    logger.info('📋 Call details', { CallSid, From, To }, 'twilio-voice');
    
    if (!To) {
      logger.error('❌ No "To" number in webhook data', twilioData, 'twilio-voice');
      return createErrorTwimlResponse('Invalid call data');
    }

    // Look up phone number and agent configuration
    const phoneNumberRecord = await prisma.twilioPhoneNumber.findFirst({
      where: { phoneNumber: To },
      include: {
        chatbot: {
          include: {
            model: true
          }
        },
        user: true
      }
    });

    if (!phoneNumberRecord) {
      logger.warn('⚠️  Phone number not found', { phoneNumber: To }, 'twilio-voice');
      return createErrorTwimlResponse('This number is not configured');
    }

    // Validate webhook signature
    const signature = req.headers.get('x-twilio-signature');
    const url = req.url;
    const authToken = phoneNumberRecord.subaccountAuthToken || TWILIO_AUTH_TOKEN;
    
    if (signature && url) {
      const isValid = twilio.validateRequest(authToken, signature, url, twilioData);
      if (!isValid) {
        logger.error('❌ Invalid Twilio signature', { CallSid }, 'twilio-voice');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const agent = phoneNumberRecord.chatbot;
    const user = phoneNumberRecord.user;

    if (!agent) {
      logger.warn('⚠️  No agent assigned to phone number', { phoneNumber: To }, 'twilio-voice');
      return createErrorTwimlResponse('This number is not configured with an agent');
    }

    logger.info('🤖 Agent found', { 
      agentId: agent.id, 
      agentName: agent.name,
      model: agent.model?.name 
    }, 'twilio-voice');

    // Create LiveKit room for this call
    const roomName = `call_${CallSid}`;
    
    try {
      // Prepare comprehensive agent configuration
      const agentConfig = {
        // Agent identification
        agentId: agent.id,
        name: agent.name,
        userId: user.id,
        
        // Core AI settings
        systemPrompt: agent.prompt,
        modelId: agent.modelId,
        model: agent.model?.name || 'gpt-4o-mini',
        temperature: agent.temperature || 0.7,
        maxTokens: 4000,
        
        // Voice settings
        language: agent.language || 'en-US',
        voice: agent.voice,
        elevenLabsVoiceId: agent.voice,
        voiceName: 'Adam', // Default name
        voiceStability: 0.3,
        voiceSimilarity: 0.75,
        voiceStyle: 0.0,
        
        // Call context
        source: 'phone',
        callSid: CallSid,
        fromNumber: From,
        toNumber: To,
        
        // Messages
        welcomeMessage: agent.welcomeMessage,
        chatbotErrorMessage: agent.chatbotErrorMessage,
        
        // Call settings
        silenceTimeout: agent.silenceTimeout,
        callTimeout: agent.callTimeout,
        checkUserPresence: agent.checkUserPresence,
        presenceMessage: agent.presenceMessage,
        presenceMessageDelay: agent.presenceMessageDelay,
        hangUpMessage: agent.hangUpMessage
      };

      // Create room with agent configuration in metadata
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 600, // 10 minutes
        maxParticipants: 10, // Allow multiple participants
        metadata: JSON.stringify(agentConfig)
      });
      
      logger.info('🏠 LiveKit room created', { roomName }, 'twilio-voice');

      // Generate participant token for the caller
      const callerToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: `caller_${From.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: `Caller ${From}`,
        ttl: '2h'
      });

      callerToken.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true
      });

      const callerJwt = await callerToken.toJwt();

      // Return TwiML that connects call to LiveKit
      return createLiveKitTwimlResponse(roomName, callerJwt, CallSid);

    } catch (error) {
      logger.error('❌ Error setting up LiveKit room', { 
        error: error.message,
        CallSid,
        agentId: agent.id 
      }, 'twilio-voice');
      return createErrorTwimlResponse('Error connecting your call');
    }

  } catch (error) {
    logger.error('❌ Error processing voice webhook', { 
      error: error.message 
    }, 'twilio-voice');
    return createErrorTwimlResponse('An error occurred processing your call');
  }
}

// Create TwiML that connects Twilio call to LiveKit room
function createLiveKitTwimlResponse(roomName: string, callerToken: string, callSid: string) {
  const twiml = new twilio.twiml.VoiceResponse();

  logger.info('🔗 Connecting call to LiveKit', { roomName, callSid }, 'twilio-voice');

  // Connect to LiveKit room via WebRTC media streaming
  const connect = twiml.connect();
  
  // Use Twilio's stream to connect to LiveKit
  const stream = connect.stream({
    name: 'livekit-media-stream',
    url: `wss://${process.env.FLY_APP_NAME || 'voice-server'}.fly.dev/media-stream`
  });
  
  // Pass room information to the media stream handler
  stream.parameter({
    name: 'room',
    value: roomName
  });
  
  stream.parameter({
    name: 'token',
    value: callerToken
  });
  
  stream.parameter({
    name: 'callSid',
    value: callSid
  });

  // Add connect action that will be called after stream ends
  twiml.say('Thank you for calling. Goodbye!');

  logger.info('✅ TwiML response generated', { roomName, callSid }, 'twilio-voice');

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml'
    }
  });
}

// Create error TwiML response
function createErrorTwimlResponse(message: string) {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(`Sorry, ${message}. Please try again later.`);
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml'
    }
  });
} 