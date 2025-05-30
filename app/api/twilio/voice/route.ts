import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  console.log('Voice webhook called');
  
  try {
    // Parse the request body from Twilio (form data)
    const formData = await req.formData();
    
    // Validate the request is from Twilio
    if (!validateTwilioRequest(req, formData)) {
      console.error('Invalid Twilio request');
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
    
    console.log('Received voice webhook data:', twilioData);
    
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
      console.log(`Looking up agent with ID: ${agentId}`);
      agent = await prisma.chatbot.findUnique({
        where: { id: agentId },
        include: {
          model: true,
        }
      });
    } else if (to) {
      console.log(`No agent ID provided, looking up by phone number: ${to}`);
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
      console.error('No agent found for this call');
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, this number is not configured to receive calls.');
      twiml.hangup();
      
      return new NextResponse(twiml.toString(), {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
    
    console.log(`Call will be handled by agent: ${agent.name} (${agent.id})`);
    
    // Create a TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Start with a welcome message using the agent's configuration
    const welcomeMessage = agent.welcomeMessage || 'Hello! I\'m your AI assistant. How can I help you today?';
    
    // Set language based on agent configuration
    const language = agent.language || 'en-US';
    
    // Get the configured silence and call timeouts
    const silenceTimeout = agent.silenceTimeout || 5; // Default to 5 seconds if not specified
    const callTimeoutSeconds = agent.callTimeout || 300; // Default to 5 minutes if not specified
    
    // Check if we should use ElevenLabs voice
    if (agent.voice) {
      console.log(`Using ElevenLabs voice ID: ${agent.voice}`);
      // Generate the TTS endpoint URL for the welcome message
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
      const ttsEndpoint = `${baseUrl}/api/twilio/tts?message=${encodeURIComponent(welcomeMessage)}&voice=${encodeURIComponent(agent.voice)}`;
      
      // Play the welcome message using ElevenLabs
      twiml.play(ttsEndpoint);
    } else {
      // Fall back to Twilio TTS with Polly voices
      const voice = 'Polly.Joanna';
    twiml.say({ voice, language }, welcomeMessage);
    }
    
    // Use Gather to collect user speech
    const gather = twiml.gather({
      input: ['speech'],
      speechTimeout: silenceTimeout,
      speechModel: 'phone_call',
      enhanced: true,
      language: language,
      action: `/api/twilio/voice/respond?agentId=${agent.id}`,
      method: 'POST',
      actionOnEmptyResult: true,
    });
    
    // If user doesn't say anything, redirect to respond endpoint to handle silence
    twiml.redirect(`/api/twilio/voice/respond?agentId=${agent.id}`);
    
    // Create a thread for this call if it doesn't exist
    try {
      const threadId = `call-${callSid}`;
      const existingThread = await prisma.message.findFirst({
        where: { threadId }
      });
      
      if (!existingThread) {
        // Create a new thread ID in the messages table
        await prisma.message.create({
          data: {
            threadId,
            message: "Call started",
            response: welcomeMessage,
            from: from,
            userId: agent.userId,
            chatbotId: agent.id,
          }
        });
        
        console.log(`Created thread ${threadId} for call from ${from}`);
      }
    } catch (dbError) {
      console.error('Error creating call thread:', dbError);
      // Continue with the call even if we couldn't create the thread
    }
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    console.error('Error processing voice webhook:', error);
    
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