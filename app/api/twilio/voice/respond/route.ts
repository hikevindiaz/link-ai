import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';
import OpenAI from 'openai';
import { ElevenLabsClient } from 'elevenlabs';
import { generateSpeech, generateSpeechUrl } from '@/lib/elevenlabs';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

export async function POST(req: NextRequest) {
  console.log('Voice respond webhook called');
  
  try {
    // Parse the request body from Twilio (form data)
    const formData = await req.formData();
    
    const twilioData: Record<string, string> = {};
    
    // Convert FormData to a plain object
    formData.forEach((value, key) => {
      twilioData[key] = value.toString();
    });
    
    console.log('Received voice respond webhook data:', twilioData);
    
    // Extract relevant fields from the Twilio request
    const {
      From: from,
      CallSid: callSid,
      SpeechResult: userSpeech,
      Confidence: confidence,
    } = twilioData;
    
    // Extract agentId from URL query parameters
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    
    if (!agentId) {
      console.error('No agent ID provided in the request');
      return createTwimlResponse('Sorry, there was an error processing your call. Agent ID is missing.', true);
    }
    
    // Fetch the agent/chatbot details
    const agent = await prisma.chatbot.findUnique({
      where: { id: agentId },
      include: {
        model: true,
      }
    });
    
    if (!agent) {
      console.error(`Agent with ID ${agentId} not found`);
      return createTwimlResponse('Sorry, the agent associated with this call was not found.', true);
    }
    
    console.log(`Call respond handled by agent: ${agent.name} (${agent.id})`);
    
    // The thread ID format should match what's used in the voice webhook
    const threadId = `call-${callSid}`;
    
    // Check if we should end the call due to silence
    if (!userSpeech) {
      console.log('No speech detected from user');
      
      if (agent.checkUserPresence) {
        // If presence check is enabled, ask if the user is still there
        console.log('Presence check enabled, asking if user is still there');
        
        const presenceMessage = agent.presenceMessage || 'Are you still there?';
        
        // Save the presence check message to the thread
        await saveMessageToThread(threadId, 'No speech detected', presenceMessage, from, agent);
      
        // Generate TwiML to ask if the user is still there and continue gathering speech
        return createPresenceCheckResponse(presenceMessage, agent, threadId);
      } else {
        // If presence check is disabled or we've already asked, hang up
        console.log('Ending call due to silence');
        
        const hangUpMessage = agent.hangUpMessage || 
          "I haven't heard from you, so I'll end the call. Feel free to call back when you're ready.";
          
        // Save the hang-up message to the thread
        await saveMessageToThread(threadId, 'Call ended due to silence', hangUpMessage, from, agent);
        
        // Return TwiML to say the hang-up message and end the call
        return createTwimlResponse(hangUpMessage, true);
      }
    }
    
    console.log(`User speech: "${userSpeech}" (confidence: ${confidence})`);
    
    // Retrieve conversation history
    const history = await getConversationHistory(threadId);
    
    // Get AI response from OpenAI
    const aiResponse = await generateAIResponse(userSpeech, agent, history);
    
    // Save the message and response to the thread
    await saveMessageToThread(threadId, userSpeech, aiResponse, from, agent);
    
    // Check if we should use ElevenLabs or default Twilio TTS
    if (agent.voice) {
      try {
        // Generate speech with ElevenLabs
        return await createElevenLabsResponse(aiResponse, agent, threadId);
      } catch (error) {
        console.error('Error generating ElevenLabs speech:', error);
        // Fall back to Twilio TTS if ElevenLabs fails
        return createTwimlResponse(aiResponse, false, agent);
        }
    } else {
      // Use default Twilio TTS if no ElevenLabs voice is specified
      return createTwimlResponse(aiResponse, false, agent);
    }
    
  } catch (error) {
    console.error('Error processing voice respond webhook:', error);
    
    // Return a TwiML response with an error message
    return createTwimlResponse('Sorry, an error occurred processing your call.', true);
  }
}

// Helper to save message/response to the thread
async function saveMessageToThread(
  threadId: string, 
  message: string, 
  response: string, 
  from: string,
  agent: any
) {
  try {
    await prisma.message.create({
      data: {
        threadId,
        message,
        response,
        from,
        userId: agent.userId,
        chatbotId: agent.id,
      }
    });
    console.log(`Saved message to thread ${threadId}`);
  } catch (error) {
    console.error('Error saving message to thread:', error);
    // Continue even if saving fails
      }
}

// Helper to retrieve conversation history
async function getConversationHistory(threadId: string) {
  try {
    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: 10, // Limit to recent messages
    });
    
    return messages.map(msg => ({
      role: msg.from === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.from === 'user' ? msg.message : msg.response,
    })).reverse(); // Reverse to get chronological order
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return []; // Return empty history if error
  }
}

// Helper to generate AI response
async function generateAIResponse(userSpeech: string, agent: any, history: any[]) {
  // Determine how to set temperature based on responseRate
  let temperature = 0.7; // Default
  if (agent.responseRate === 'rapid') {
    temperature = 0.5; // Lower temperature for more focused responses
  } else if (agent.responseRate === 'patient') {
    temperature = 0.9; // Higher temperature for more thoughtful responses
  }
  
  // Create full message array with system prompt and history
  const messages = [
    { role: 'system' as const, content: agent.prompt || 'You are a helpful AI assistant on a phone call. Respond in a conversational and concise way.' },
    ...history,
    { role: 'user' as const, content: userSpeech },
  ];
  
  // Generate response from OpenAI
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview', // Use the best available model
        messages,
      temperature,
      max_tokens: agent.maxCompletionTokens || 150, // Limit token count for voice responses
      });
      
    return response.choices[0]?.message?.content?.trim() || 
      'I apologize, but I am having trouble generating a response. Can you please rephrase your question?';
  } catch (error) {
    console.error('Error generating OpenAI response:', error);
    return 'I apologize, but I encountered an error processing your request. Let me try to help you with something else.';
  }
}

// Helper to create a TwiML response with Twilio's TTS
function createTwimlResponse(message: string, endCall: boolean = false, agent?: any) {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Use the agent's language if available, otherwise default to English
  const language = agent?.language || 'en-US';
  // Use the specified voice if available, otherwise default to a neutral voice
  const voice = 'Polly.Joanna'; // Using Amazon Polly voices for better quality
  
  // Say the AI response
  twiml.say({ voice, language }, message);
  
  if (endCall) {
    // End the call
    twiml.hangup();
  } else {
    // Continue gathering speech
    const gather = twiml.gather({
      input: ['speech'],
      speechTimeout: agent?.silenceTimeout || 5,
      speechModel: 'phone_call',
      enhanced: true,
      language,
      action: `/api/twilio/voice/respond?agentId=${agent?.id}`,
      method: 'POST',
      actionOnEmptyResult: true,
    });
    
    // Add a subtle prompt if desired
    // gather.say({ voice, language }, 'I\'m listening.');
    
    // If the user doesn't say anything, we'll redirect to the same endpoint
    twiml.redirect(`/api/twilio/voice/respond?agentId=${agent?.id}`);
  }
  
  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml'
    }
        });
      }
      
// Helper to create a presence check response
function createPresenceCheckResponse(message: string, agent: any, threadId: string) {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Use the agent's language if available, otherwise default to English
  const language = agent.language || 'en-US';
  // Use a specified voice if available, otherwise default to a neutral voice
  const voice = 'Polly.Joanna';
  
  // Say the presence check message
  twiml.say({ voice, language }, message);
  
  // Continue gathering speech with a shorter timeout
  const gather = twiml.gather({
    input: ['speech'],
    speechTimeout: agent.presenceMessageDelay || 3,
    speechModel: 'phone_call',
    enhanced: true,
    language,
    action: `/api/twilio/voice/respond?agentId=${agent.id}`,
    method: 'POST',
    actionOnEmptyResult: true,
  });
  
  // If the user still doesn't respond, hang up
  twiml.redirect(`/api/twilio/voice/hangup?agentId=${agent.id}&threadId=${threadId}`);
  
  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml'
    }
  });
    }
    
// Helper to create a response with ElevenLabs TTS
async function createElevenLabsResponse(message: string, agent: any, threadId: string) {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // First, check if we have a valid voice ID
    if (!agent.voice) {
      console.log('No voice ID specified, falling back to Twilio TTS');
      return createTwimlResponse(message, false, agent);
    }

    console.log(`Generating ElevenLabs speech with voice ID: ${agent.voice}`);
    
    // Create a TTS endpoint URL that will generate speech on demand
    // This approach doesn't require storing files and works with Twilio
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const ttsEndpoint = `${baseUrl}/api/twilio/tts?message=${encodeURIComponent(message)}&voice=${encodeURIComponent(agent.voice)}`;
    
    // Use the <Play> verb to play the generated audio from our endpoint
    twiml.play(ttsEndpoint);
    
    console.log(`Using ElevenLabs audio with TTS endpoint: ${ttsEndpoint}`);
    
    // Continue gathering speech after playing the audio
    const gather = twiml.gather({
      input: ['speech'],
      speechTimeout: agent.silenceTimeout || 5,
      speechModel: 'phone_call',
      enhanced: true,
      language: agent.language || 'en-US',
      action: `/api/twilio/voice/respond?agentId=${agent.id}`,
      method: 'POST',
      actionOnEmptyResult: true,
    });
    
    // If the user doesn't say anything, redirect to check presence or hang up
    twiml.redirect(`/api/twilio/voice/respond?agentId=${agent.id}`);
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    console.error('Error generating ElevenLabs response:', error);
    // Fall back to regular TwiML if there's an error
    return createTwimlResponse(message, false, agent);
  }
} 