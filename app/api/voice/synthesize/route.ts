import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ProviderFactory } from '@/lib/agent-runtime/provider-factory';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, chatbotId, sessionConfig } = await req.json();

    if (!text || !chatbotId) {
      return NextResponse.json({ error: 'Missing text or chatbotId' }, { status: 400 });
    }

    // Get chatbot configuration
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: { model: true }
    });

    if (!chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // Check if user owns this chatbot
    if (chatbot.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine which TTS service to use
    const modelName = chatbot.model?.name || 'gpt-4o-mini';
    const provider = ProviderFactory.getProviderFromModel(modelName);
    const useGoogleTTS = provider === 'gemini' && process.env.GOOGLE_AI_API_KEY;

    let audioBuffer: Buffer;

    if (useGoogleTTS) {
      audioBuffer = await synthesizeWithGoogleTTS(text, chatbot);
    } else if (process.env.OPENAI_API_KEY) {
      audioBuffer = await synthesizeWithOpenAITTS(text, chatbot);
    } else {
      return NextResponse.json({ error: 'No TTS service available' }, { status: 500 });
    }

    console.log(`[Voice TTS] Synthesized audio for chatbot ${chatbotId}: ${text.substring(0, 100)}...`);

    // Return audio as response
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('[Voice TTS] Error synthesizing audio:', error);
    return NextResponse.json(
      { error: 'Failed to synthesize audio' },
      { status: 500 }
    );
  }
}

async function synthesizeWithOpenAITTS(text: string, chatbot: any): Promise<Buffer> {
  const voice = mapVoiceForOpenAI(chatbot.voice);
  
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: voice,
      input: text,
      response_format: 'mp3'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS error: ${response.statusText} - ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeWithGoogleTTS(text: string, chatbot: any): Promise<Buffer> {
  const voice = mapVoiceForGoogle(chatbot.voice, chatbot.language);
  
  const requestBody = {
    input: { text },
    voice: {
      languageCode: chatbot.language || 'en-US',
      name: voice,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 24000,
    }
  };

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google TTS error: ${response.statusText} - ${error}`);
  }

  const result = await response.json();
  return Buffer.from(result.audioContent, 'base64');
}

/**
 * Map voice settings to OpenAI TTS voices
 */
function mapVoiceForOpenAI(voice?: string): string {
  const voiceMap: Record<string, string> = {
    'alloy': 'alloy',
    'echo': 'echo',
    'fable': 'fable',
    'onyx': 'onyx',
    'nova': 'nova',
    'shimmer': 'shimmer'
  };
  
  return voiceMap[voice || 'alloy'] || 'alloy';
}

/**
 * Map voice settings to Google TTS voices
 */
function mapVoiceForGoogle(voice?: string, language?: string): string {
  const languageCode = language || 'en-US';
  
  // Default voice mappings for different languages
  const defaultVoices: Record<string, string> = {
    'en-US': 'en-US-Standard-A',
    'en-GB': 'en-GB-Standard-A',
    'es-ES': 'es-ES-Standard-A',
    'fr-FR': 'fr-FR-Standard-A',
    'de-DE': 'de-DE-Standard-A'
  };
  
  // Voice quality mappings (prefer Wavenet when available)
  const voiceMap: Record<string, Record<string, string>> = {
    'en-US': {
      'alloy': 'en-US-Standard-A',
      'echo': 'en-US-Standard-B',
      'fable': 'en-US-Standard-C',
      'onyx': 'en-US-Standard-D',
      'nova': 'en-US-Wavenet-A',
      'shimmer': 'en-US-Wavenet-B'
    },
    'en-GB': {
      'alloy': 'en-GB-Standard-A',
      'echo': 'en-GB-Standard-B',
      'fable': 'en-GB-Standard-C',
      'onyx': 'en-GB-Standard-D',
      'nova': 'en-GB-Wavenet-A',
      'shimmer': 'en-GB-Wavenet-B'
    }
  };
  
  const languageVoices = voiceMap[languageCode];
  if (languageVoices && voice && languageVoices[voice]) {
    return languageVoices[voice];
  }
  
  return defaultVoices[languageCode] || 'en-US-Standard-A';
} 