import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';
import { PrismaClient } from '@prisma/client';

// Ensure API key is set
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
if (!elevenLabsApiKey) {
  console.error("Missing ELEVENLABS_API_KEY for TTS");
}

// Initialize clients
const prisma = new PrismaClient();
const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey! });

const DEFAULT_VOICE = 'Rachel'; // Fallback voice

export async function POST(req: NextRequest) {
  console.log('Received request for /api/tts');
  let prismaConnected = true; 

  try {
    // 1. Extract text and chatbotId from request body
    const body = await req.json();
    const { text, chatbotId } = body;

    if (!text) {
      return NextResponse.json({ error: 'Missing text for TTS' }, { status: 400 });
    }
    if (!chatbotId) {
      return NextResponse.json({ error: 'Missing chatbotId for TTS voice selection' }, { status: 400 });
    }

    console.log(`Generating TTS for chatbot ${chatbotId}`);

    // 2. Fetch Chatbot Voice
    let voiceToUse = DEFAULT_VOICE;
    try {
        const chatbot = await prisma.chatbot.findUnique({
            where: { id: chatbotId },
            select: { voice: true },
        });
        if (chatbot?.voice) {
            voiceToUse = chatbot.voice;
            console.log('Using voice from chatbot config:', voiceToUse);
        } else {
             console.log('Chatbot voice not configured, using default:', voiceToUse);
        }
    } catch (dbError) {
        console.error('Error fetching chatbot voice from DB:', dbError);
        // Proceed with default voice if DB fetch fails
    }

    // 3. Synthesize speech using ElevenLabs
    console.log(`Synthesizing speech with ElevenLabs TTS (Voice: ${voiceToUse})...`);
    let audioBuffer: Buffer;
    try {
        const audioResult = await elevenlabs.textToSpeech.convert(
            voiceToUse,
            {
                text: text,
                model_id: 'eleven_multilingual_v2' // Or appropriate model
            }
        );

        // Handle stream or buffer result
        if (Buffer.isBuffer(audioResult)) {
            audioBuffer = audioResult;
        } else if (typeof audioResult?.pipe === 'function') {
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
    
    // 4. Return audio data (e.g., as base64 or direct audio response)
    const audioBase64 = audioBuffer.toString('base64');
    console.log('ElevenLabs TTS audio generated, returning base64.');

    return NextResponse.json({
        audioBase64: audioBase64,
    });

    /* 
    // Alternative: Return direct audio stream
    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg'); 
    return new Response(audioBuffer, { status: 200, headers });
    */

  } catch (error) {
    console.error('Error in /api/tts:', error);
    prismaConnected = false; 
    return NextResponse.json({ error: 'Internal server error in TTS generation' }, { status: 500 });
  } finally {
      if (prismaConnected) {
          try {
              await prisma.$disconnect();
              console.log('Prisma client disconnected.');
          } catch (disconnectError) {
              console.error('Error disconnecting Prisma:', disconnectError);
          }
      }
  }
} 