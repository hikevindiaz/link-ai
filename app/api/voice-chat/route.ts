import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

// Ensure API keys are set in your .env file
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!elevenLabsApiKey || !openaiApiKey) {
  console.error("Missing API keys for voice processing (ElevenLabs or OpenAI)");
}

// Initialize clients
const prisma = new PrismaClient();
const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey! });
const openai = new OpenAI({ apiKey: openaiApiKey! });

const DEFAULT_VOICE = 'Rachel'; // Fallback voice

export async function POST(req: NextRequest) {
  console.log('Received request for /api/voice-chat');
  let prismaConnected = true; // Flag to track connection status for disconnect
  try {
    // 1. Extract audio, chatbotId, and threadId
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob | null;
    const chatbotId = formData.get('chatbotId') as string | null;
    const threadId = formData.get('threadId') as string | null;

    if (!audioBlob) {
      console.error('No audio blob found in request');
      return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
    }
    if (!chatbotId) {
        console.error('No chatbotId found in request');
        return NextResponse.json({ error: 'Missing chatbotId' }, { status: 400 });
    }
    if (!threadId) {
        console.error('No threadId found in request');
        return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    }

    console.log(`Processing for chatbotId: ${chatbotId}, threadId: ${threadId}`);

    // --- Fetch Chatbot Voice & Prompt --- 
    let voiceToUse = DEFAULT_VOICE;
    let systemPrompt = "You are a helpful voice assistant."; // Default prompt
    try {
        const chatbot = await prisma.chatbot.findUnique({
            where: { id: chatbotId },
            select: { voice: true, prompt: true },
        });
        if (chatbot?.voice) {
            voiceToUse = chatbot.voice;
            console.log('Using voice from chatbot config:', voiceToUse);
        }
        if (chatbot?.prompt) {
            systemPrompt = chatbot.prompt;
            console.log('Using system prompt from chatbot config.');
        } else {
            console.log('Chatbot prompt not configured, using default.');
        }
    } catch (dbError) {
        console.error('Error fetching chatbot config from DB:', dbError);
    }
    // ------------------------

    // 2. Transcribe audio using ElevenLabs SDK (Correct Method)
    console.log('Transcribing audio with ElevenLabs SDK STT...');
    let transcript = '';
    try {
        const transcriptionResult = await elevenlabs.speechToText.convert({
            file: audioBlob, 
            model_id: 'scribe_v1', // Changed model_id back based on error
        });

        // Parse the result based on documentation/example (assuming .text property)
        if (transcriptionResult && typeof transcriptionResult.text === 'string') {
            transcript = transcriptionResult.text;
        } else {
            console.warn('Unexpected ElevenLabs STT SDK result structure:', transcriptionResult);
            transcript = ''; 
        }
        console.log('ElevenLabs STT Transcript:', transcript);
    } catch (sttError) {
        console.error('ElevenLabs STT SDK error:', sttError);
        // Log more details if available
        if (sttError instanceof Error) {
            console.error('Error details:', sttError.message, sttError.stack);
        }
        return NextResponse.json({ error: 'Failed to transcribe audio with ElevenLabs SDK' }, { status: 500 });
    }

    if (!transcript) {
        console.log('ElevenLabs returned empty transcript');
        // Decide how to handle - maybe return a default message?
        return NextResponse.json({ textResponse: "Sorry, I didn't catch that.", audioBase64: null }, { status: 200 });
    }

    // --- Fetch Conversation History --- 
    let history: { role: 'user' | 'assistant', content: string }[] = [];
    const historyLimit = 10; // Number of past messages to include
    try {
        const recentMessages = await prisma.message.findMany({
            where: { threadId: threadId },
            orderBy: { createdAt: 'asc' }, // Get oldest first to maintain order
            take: historyLimit, 
        });
        
        // Format for OpenAI
        history = recentMessages.map(msg => ({
            role: msg.from === 'user' ? 'user' : 'assistant', // Map 'from' to role
            content: msg.from === 'user' ? msg.message : msg.response // Map message/response to content
        }));
        console.log(`Fetched ${history.length} messages for history.`);

    } catch (dbError) {
        console.error(`Error fetching history for thread ${threadId}:`, dbError);
        // Proceed without history if fetching fails
    }
    // ------------------------------

    // 3. Get AI response from OpenAI (with history)
    console.log('Getting response from OpenAI...');
    const messagesToOpenAI = [
        { role: "system" as const, content: systemPrompt },
        ...history, // Include fetched history
        { role: "user" as const, content: transcript } // Current user input
    ];

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messagesToOpenAI, // Use the array with history
    });

    const aiTextResponse = completion.choices[0]?.message?.content?.trim();
    console.log('OpenAI Response:', aiTextResponse);

    if (!aiTextResponse) {
        console.error('OpenAI returned no response text');
        return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
    }

    // 4. Synthesize speech using ElevenLabs (Correct TTS Method)
    console.log(`Synthesizing speech with ElevenLabs TTS (Voice: ${voiceToUse})...`);
    let audioBuffer: Buffer;
    try {
        // Try textToSpeech.convert with separate arguments
        const audioResult = await elevenlabs.textToSpeech.convert(
            voiceToUse,         // Argument 1: voiceId
            {
                text: aiTextResponse,      // Argument 2: Options object with 'text'
                model_id: 'eleven_multilingual_v2' // Model ID inside options
                // Add other TTS settings like stability here if needed
            }
        );

        // Assuming audioResult contains the audio data (Buffer or Stream)
        if (Buffer.isBuffer(audioResult)) {
            audioBuffer = audioResult;
        } else if (typeof audioResult?.pipe === 'function') { // Check if it's a readable stream
            const chunks: Buffer[] = [];
            for await (const chunk of audioResult) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            audioBuffer = Buffer.concat(chunks);
        } else {
             console.error('Unexpected TTS result format:', audioResult);
             throw new Error('Failed to get audio buffer from ElevenLabs TTS');
        }

    } catch (ttsError) {
        console.error('ElevenLabs TTS error:', ttsError);
         return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: 500 });
    }
    
    const audioBase64 = audioBuffer.toString('base64');
    console.log('ElevenLabs TTS audio generated and encoded to base64');

    // 5. Return text response and audio data
    return NextResponse.json({
        transcript: transcript, // Also return the transcript
        textResponse: aiTextResponse,
        audioBase64: audioBase64,
    });

  } catch (error) {
    console.error('Error in /api/voice-chat:', error);
    prismaConnected = false; // Avoid disconnect if connection failed initially
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
      if (prismaConnected) {
          await prisma.$disconnect();
          console.log('Prisma client disconnected.');
      }
  }
} 