import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// OpenAI available voices
export const OPENAI_VOICES = [
  'alloy',
  'ash', 
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse'
] as const;

export type OpenAIVoice = typeof OPENAI_VOICES[number];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const { text, voice, instructions, language } = data;
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    
    if (!voice || !OPENAI_VOICES.includes(voice)) {
      return NextResponse.json({ error: 'Valid OpenAI voice is required' }, { status: 400 });
    }
    
    console.log(`[OpenAI TTS] Generating speech with voice: ${voice}, language: ${language || 'auto'}`);
    
    // Build comprehensive instructions based on language and custom instructions
    let finalInstructions = '';
    
    // Add language-specific instructions
    if (language) {
      const languageInstructions = getLanguageInstructions(language);
      if (languageInstructions) {
        finalInstructions += languageInstructions;
      }
    }
    
    // Add custom personality instructions
    if (instructions?.trim()) {
      if (finalInstructions) {
        finalInstructions += ' ';
      }
      finalInstructions += instructions.trim();
    }
    
    // Prepare the API call payload
    const requestPayload: any = {
      model: 'gpt-4o-mini-tts', // Use the newer model that supports instructions
      voice: voice as OpenAIVoice,
      input: text,
      response_format: 'mp3',
      speed: 1.0,
    };
    
    // Add instructions if we have any
    if (finalInstructions) {
      requestPayload.instructions = finalInstructions;
    }
    
    console.log(`[OpenAI TTS] Using instructions: ${finalInstructions || 'none'}`);
    
    const response = await openai.audio.speech.create(requestPayload);
    
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
    
  } catch (error) {
    console.error('Error generating OpenAI TTS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to generate speech',
      details: errorMessage 
    }, { status: 500 });
  }
}

// Helper function to generate language-specific instructions
function getLanguageInstructions(language: string): string {
  const languageMap: Record<string, string> = {
    'es': 'Speak in Spanish with a natural Spanish accent and pronunciation.',
    'en': 'Speak in English with clear pronunciation.',
    'fr': 'Speak in French with a natural French accent and pronunciation.',
    'de': 'Speak in German with a natural German accent and pronunciation.',
    'it': 'Speak in Italian with a natural Italian accent and pronunciation.',
    'pt': 'Speak in Portuguese with a natural Portuguese accent and pronunciation.',
    'ru': 'Speak in Russian with a natural Russian accent and pronunciation.',
    'ja': 'Speak in Japanese with a natural Japanese accent and pronunciation.',
    'ko': 'Speak in Korean with a natural Korean accent and pronunciation.',
    'zh': 'Speak in Chinese with a natural Chinese accent and pronunciation.',
    'ar': 'Speak in Arabic with a natural Arabic accent and pronunciation.',
    'hi': 'Speak in Hindi with a natural Hindi accent and pronunciation.',
    'th': 'Speak in Thai with a natural Thai accent and pronunciation.',
    'pl': 'Speak in Polish with a natural Polish accent and pronunciation.',
    'tr': 'Speak in Turkish with a natural Turkish accent and pronunciation.',
    'nl': 'Speak in Dutch with a natural Dutch accent and pronunciation.',
    'sv': 'Speak in Swedish with a natural Swedish accent and pronunciation.',
    'da': 'Speak in Danish with a natural Danish accent and pronunciation.',
    'no': 'Speak in Norwegian with a natural Norwegian accent and pronunciation.',
    'fi': 'Speak in Finnish with a natural Finnish accent and pronunciation.',
  };
  
  return languageMap[language] || '';
} 