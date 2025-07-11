import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ElevenLabs voice categorization - Updated with actual voice IDs from user's account
const VOICE_CATEGORIES = {
  'Featured Voices ✨': [
    'XXsBDdWcaBwGFMjlkpTk', // David
    'o23dcncTCdpfslLGLVQO', // isabella
    'ed4GJ8WlKc0WZP6hN6yB', // xiomara
    'mK8r15WhTmRMsh9ngXv4', // New featured voice
  ],
  'Best for English': [
    '9BWtsMINqrJLrRacOk9x', // Aria
    'EXAVITQu4vr4xnSDxMaL', // Sarah
    'FGY2WhTYpPnrIDTdsKH5', // Laura
    'XB0fDUnXU5powFXDhCwa', // Charlotte
  ],
  'Best for Spanish': [
    'ed4GJ8WlKc0WZP6hN6yB', // xiomara
    'WOSzFvlJRm2hkYb3KA5w', // Juan Campillo
    'dlGxemPxFMTY7iXagmOj', // Fernando Martinez
    'js7Ktj7UJCd7W0StVolw', // Santiago Méndez Bravo
    'zl1Ut8dvwcVSuQSB9XkG', // Ninoska - Pro Spanish Teacher
  ],
  'Upbeat': [
    'crQgCQuWgUucmYHEPsrB', // Fran - Fresh & Upbeat
    'SAz9YHcvj6GT2YYXdXww', // River
    'Xb7hH8MSUJpSbSDYk0k2', // Alice
    'pFZP5JQG7iQjIQuC4Bku', // Lily
  ],
  'Serious': [
    'JBFqnCBsd6RMkjVDRZzb', // George
    'TX3LPaxmHKxFdv7VOQHJ', // Liam
    'cjVigY5qzO86Huf0OWal', // Eric
    'onwK4e9ZLuTAKqWW03F9', // Daniel
  ],
  'Men': [
    'XXsBDdWcaBwGFMjlkpTk', // David
    'IKne3meq5aSn9XLyUdCD', // Charlie
    'JBFqnCBsd6RMkjVDRZzb', // George
    'N2lVS1w4EtoT3dr4eOWO', // Callum
    'TX3LPaxmHKxFdv7VOQHJ', // Liam
    'bIHbv24MWmeRgasZH58o', // Will
    'cjVigY5qzO86Huf0OWal', // Eric
    'nPczCjzI2devNBz1zQrb', // Brian
    'onwK4e9ZLuTAKqWW03F9', // Daniel
    'pqHfZKP75CvOlQylNhV4', // Bill
    'WOSzFvlJRm2hkYb3KA5w', // Juan Campillo
    'dlGxemPxFMTY7iXagmOj', // Fernando Martinez
    'js7Ktj7UJCd7W0StVolw', // Santiago Méndez Bravo
    'l1zE9xgNpUTaQCZzpNJa', // Alberto Rodriguez
    'sKgg4MPUDBy69X7iv3fA', // Alejandro Durán
  ],
  'Women': [
    'o23dcncTCdpfslLGLVQO', // Isabella
    'ed4GJ8WlKc0WZP6hN6yB', // Xiomara
    '9BWtsMINqrJLrRacOk9x', // Aria
    'EXAVITQu4vr4xnSDxMaL', // Sarah
    'FGY2WhTYpPnrIDTdsKH5', // Laura
    'XB0fDUnXU5powFXDhCwa', // Charlotte
    'Xb7hH8MSUJpSbSDYk0k2', // Alice
    'XrExE9yKIg1WjnnlVkGX', // Matilda
    'cgSgspJ2msm6clMCkdW9', // Jessica
    'iP95p4xoKVk53GoZ742B', // Chris
    'pFZP5JQG7iQjIQuC4Bku', // Lily
    '6JSoCQ43KH437uIcMmw1', // Mary
    'crQgCQuWgUucmYHEPsrB', // Fran - Fresh & Upbeat
    'zl1Ut8dvwcVSuQSB9XkG', // Ninoska - Pro Spanish Teacher
  ],
};

// Helper function to fetch voice data from ElevenLabs
async function fetchVoiceFromElevenLabs(voiceId: string, apiKey: string) {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch voice ${voiceId}:`, response.status);
      return null;
    }

    const voiceData = await response.json();
    
    return {
      id: voiceData.voice_id,
      name: voiceData.name,
      description: voiceData.description || 'Professional voice',
      languages: voiceData.labels?.language ? [voiceData.labels.language] : ['English'],
      gender: voiceData.labels?.gender || 'unknown',
      accent: voiceData.labels?.accent || null,
      age: voiceData.labels?.age || null,
      use_case: voiceData.labels?.use_case || null,
      previewUrl: voiceData.preview_url || null,
    };
  } catch (error) {
    console.error(`Error fetching voice ${voiceId}:`, error);
    return null;
  }
}

// GET /api/elevenlabs/voices - Get all available voices organized by categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    // Get all unique voice IDs from categories
    const allVoiceIds = new Set<string>();
    Object.values(VOICE_CATEGORIES).forEach(voiceIds => {
      voiceIds.forEach(id => allVoiceIds.add(id));
    });

    // Fetch voice data from ElevenLabs API
    const voiceDataPromises = Array.from(allVoiceIds).map(voiceId => 
      fetchVoiceFromElevenLabs(voiceId, apiKey)
    );

    const voiceDataResults = await Promise.all(voiceDataPromises);
    
    // Create a map of voice ID to voice data
    const voiceDataMap = new Map<string, any>();
    voiceDataResults.forEach(voiceData => {
      if (voiceData) {
        voiceDataMap.set(voiceData.id, voiceData);
      }
    });

    // Build categorized voices using real ElevenLabs data
    const categorizedVoices = Object.entries(VOICE_CATEGORIES).map(([category, voiceIds]) => ({
      category,
      voices: voiceIds
        .map(voiceId => voiceDataMap.get(voiceId))
        .filter(voice => voice !== undefined) // Remove any voices that failed to fetch
    }));

    // Calculate total voices that were successfully fetched
    const totalVoices = Array.from(voiceDataMap.values()).length;

    return NextResponse.json({ 
      categories: categorizedVoices,
      totalVoices
    });
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
} 