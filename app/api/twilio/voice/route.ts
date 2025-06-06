import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';
import { logger } from '@/lib/logger';
import { storeCallConfig, getVoiceSettings } from '@/lib/twilio/call-config';

// Verify Twilio webhook signature
const validateTwilioRequest = (req: NextRequest, body: FormData, authToken?: string): boolean => {
  // Allow bypassing signature validation for debugging (ONLY use temporarily!)
  if (process.env.TWILIO_SIGNATURE_VALIDATION === 'disabled') {
    console.warn('[Twilio Validation] WARNING: Signature validation is DISABLED - this should only be used for debugging!');
    return true;
  }
  
  // In production, validate signature using Twilio's validateRequest function
  if (process.env.NODE_ENV === 'production') {
    try {
      const twilioSignature = req.headers.get('x-twilio-signature');
      const url = req.url;
      
      console.log('[Twilio Validation] Starting validation');
      console.log('[Twilio Validation] Request URL:', url);
      console.log('[Twilio Validation] Twilio Signature:', twilioSignature ? 'Present' : 'Missing');
      
      // Use provided auth token or fall back to environment variable
      const validationToken = authToken || process.env.TWILIO_AUTH_TOKEN;
      console.log('[Twilio Validation] Using auth token:', authToken ? 'Phone-specific token' : 'Default environment token');
      
      if (!twilioSignature || !validationToken) {
        console.error('Missing Twilio signature or auth token');
        return false;
      }
      
      // Convert FormData to plain object for validation
      const params: Record<string, string> = {};
      body.forEach((value, key) => {
        params[key] = value.toString();
      });
      
      console.log('[Twilio Validation] Form params:', Object.keys(params).join(', '));
      
      // Try multiple URL variations for validation
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.getlinkai.com';
      const urlVariations = [
        url, // Original URL
        url.split('?')[0], // Without query params
        `${baseUrl}/api/twilio/voice`, // Base configured URL
        `${baseUrl}/api/twilio/voice/`, // With trailing slash
        `${baseUrl.replace('https://', 'http://')}/api/twilio/voice`, // HTTP version
        `${baseUrl.replace('https://', 'https://www.')}/api/twilio/voice`, // With www
      ];
      
      // Remove duplicates
      const uniqueUrls = [...new Set(urlVariations)];
      
      // Log what we're about to test
      console.log('[Twilio Validation] Base URL from env:', baseUrl);
      
      console.log('[Twilio Validation] Trying URL variations:', uniqueUrls.map(u => u.split('?')[0] + (u.includes('?') ? '?...' : '')));
      
      // Log the actual signature for debugging (first 10 chars only for security)
      console.log('[Twilio Validation] Signature preview:', twilioSignature?.substring(0, 10) + '...');
      
      for (const testUrl of uniqueUrls) {
        const isValid = twilio.validateRequest(
          validationToken,
          twilioSignature,
          testUrl,
          params
        );
        
        console.log(`[Twilio Validation] Testing URL: ${testUrl} - Result: ${isValid}`);
        
        if (isValid) {
          console.log('[Twilio Validation] Validation succeeded with URL:', testUrl);
          return true;
        }
      }
      
      console.error('[Twilio Validation] All validation attempts failed');
      console.error('[Twilio Validation] Expected signature for:', {
        url: url.split('?')[0],
        paramCount: Object.keys(params).length,
        authTokenLength: validationToken?.length
      });
      
      return false;
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
  
  // Log environment check
  console.log('[Environment Check] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Environment Check] TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set');
  console.log('[Environment Check] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
  
  try {
    // Parse the request body from Twilio (form data)
    const formData = await req.formData();
    
    // Log the form data before validation
    const twilioData: Record<string, string> = {};
    formData.forEach((value, key) => {
      twilioData[key] = value.toString();
    });
    logger.debug('Received form data before validation', twilioData, 'twilio-voice');
    
    // Extract the "To" number to look up auth token for subaccounts
    const toNumber = twilioData.To;
    let phoneNumberAuthToken: string | undefined;
    
    if (toNumber) {
      console.log('[Validation] Looking up phone number:', toNumber);
      const phoneNumberRecord = await prisma.twilioPhoneNumber.findFirst({
        where: { phoneNumber: toNumber }
      });
      
      if (phoneNumberRecord) {
        console.log('[Validation] Found phone number in database');
        
        // Use subaccount auth token if available
        if (phoneNumberRecord.subaccountAuthToken) {
          phoneNumberAuthToken = phoneNumberRecord.subaccountAuthToken;
          console.log('[Validation] Using subaccount auth token for validation');
        } else {
          console.log('[Validation] No subaccount auth token found, using main account token');
        }
      } else {
        console.log('[Validation] Phone number not found in database');
      }
    }
    
    // Validate the request is from Twilio using the appropriate auth token
    if (!validateTwilioRequest(req, formData, phoneNumberAuthToken)) {
      logger.error('Invalid Twilio request', twilioData, 'twilio-voice');
      return NextResponse.json(
        { error: 'Unauthorized request' },
        { status: 403 }
      );
    }
    
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
          user: true, // Include user data
          knowledgeSources: {
            select: {
              id: true,
              name: true,
              description: true,
              vectorStoreId: true
            }
          }
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
              user: true, // Include user data
              knowledgeSources: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  vectorStoreId: true
                }
              }
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
    
    // Get OpenAI API key from agent
    const openAIKey = agent.openaiKey || process.env.OPENAI_API_KEY;
    
    if (!openAIKey) {
      logger.error('No OpenAI API key found for agent', { agentId: agent.id }, 'twilio-voice');
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, this agent is not properly configured.');
      twiml.hangup();
      
      return new NextResponse(twiml.toString(), {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
    
    // Get voice settings - handles both OpenAI voice names and DB IDs
    const voiceSettings = await getVoiceSettings(agent.voice);
    
    // Build comprehensive instructions including voice personality
    let fullInstructions = agent.prompt || "You are a helpful AI assistant.";
    if (voiceSettings.personality) {
      fullInstructions = `${fullInstructions}\n\nVoice Personality: ${voiceSettings.personality}`;
    }
    if (voiceSettings.accent) {
      fullInstructions = `${fullInstructions}\n\nSpeak with a ${voiceSettings.accent} accent.`;
    }
    
    // Extract vector store IDs from knowledge sources
    const vectorStoreIds = agent.knowledgeSources
      ?.filter(ks => ks.vectorStoreId)
      .map(ks => ks.vectorStoreId) || [];
    
    // Build tools array - for now, we'll include built-in tools and prepare for custom tools
    const tools = [];
    
    // Add file search tool if there are knowledge sources
    if (vectorStoreIds.length > 0) {
      tools.push({
        type: 'file_search',
        name: 'file_search',
        file_search: {
          vector_store_ids: vectorStoreIds
        }
      });
    }
    
    // Add other built-in tools if needed
    // TODO: Load custom tools from database/configuration
    
    // Store full configuration for voice server to retrieve
    const callConfig = {
      agentId: agent.id,
      openAIKey,
      model: "gpt-4o-mini-realtime-preview-2024-12-17", // Use latest OpenAI Mini Realtime model
      voice: voiceSettings,
      instructions: fullInstructions,
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxCompletionTokens,
      tools,
      knowledge: agent.knowledgeSources || [],
      vectorStoreIds,
      callSid,
      from,
      to,
      // Additional agent settings that might be needed
      welcomeMessage: agent.welcomeMessage,
      chatbotErrorMessage: agent.chatbotErrorMessage,
      silenceTimeout: agent.silenceTimeout,
      callTimeout: agent.callTimeout,
      checkUserPresence: agent.checkUserPresence,
      presenceMessage: agent.presenceMessage,
      presenceMessageDelay: agent.presenceMessageDelay,
      hangUpMessage: agent.hangUpMessage
    };
    
    await storeCallConfig(callSid, callConfig);
    
    // Create a TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Start by pausing briefly to let the connection establish
    twiml.pause({ length: 1 });
    
    // Connect to Media Stream for real-time conversation
    const connect = twiml.connect();
    
    // Get voice server URL from environment
    const voiceServerUrl = process.env.VOICE_SERVER_URL || 'wss://voice-server.fly.dev';
    const streamUrl = `${voiceServerUrl}/api/twilio/media-stream`;
    
    logger.info(`Connecting to media stream: ${streamUrl}`, { agentId: agent.id }, 'twilio-voice');
    
    const stream = connect.stream({
      url: streamUrl,
      track: 'inbound_track'
    });
    
    // Pass minimal configuration via custom parameters
    // Voice server will fetch full config using callSid
    stream.parameter({
      name: 'callSid',
      value: callSid
    });
    
    stream.parameter({
      name: 'agentId',
      value: agent.id
    });
    
    stream.parameter({
      name: 'openAIKey',
      value: openAIKey
    });
    
    stream.parameter({
      name: 'voice',
      value: voiceSettings.openAIVoice
    });
    
    stream.parameter({
      name: 'prompt',
      value: fullInstructions.substring(0, 500) // Backup in case config fetch fails
    });
    
    stream.parameter({
      name: 'temperature',
      value: String(agent.temperature || 0.7)
    });
    
    stream.parameter({
      name: 'from',
      value: from
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
            userId: agent.userId, // Should now be valid with user relation
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