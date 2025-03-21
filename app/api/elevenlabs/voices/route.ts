import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get API key from environment variables
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key is not configured' }, { status: 500 });
    }

    // Fetch all voices from ElevenLabs
    const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey
      }
    });

    if (!voicesResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch voices from ElevenLabs' }, { status: voicesResponse.status });
    }

    const voicesData = await voicesResponse.json();
    
    // Fetch detailed information for each voice including sample text and settings
    const detailedVoicesPromises = voicesData.voices.map(async (voice: any) => {
      try {
        const detailsResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.voice_id}/settings`, {
          headers: {
            'Accept': 'application/json',
            'xi-api-key': apiKey
          }
        });
        
        if (!detailsResponse.ok) {
          console.warn(`Failed to fetch settings for voice ${voice.voice_id}`);
          return {
            ...voice,
            sampleText: voice.preview_url ? 'Hi there, this is a sample of my voice.' : null,
            settings: {
              stability: 0.75,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true
            }
          };
        }
        
        const settings = await detailsResponse.json();
        
        // Extract language information from fine_tuning or labels
        let language = 'en'; // Default to English
        
        // Check fine_tuning for language information
        if (voice.fine_tuning && voice.fine_tuning.language) {
          language = voice.fine_tuning.language;
        }
        
        // Check labels for language or accent information
        if (voice.labels) {
          // Check for Spanish keywords in labels
          const isSpanish = Object.values(voice.labels).some((label: any) => 
            typeof label === 'string' && 
            (label.toLowerCase().includes('spanish') || 
             label.toLowerCase().includes('español') || 
             label.toLowerCase().includes('latino') || 
             label.toLowerCase().includes('latina') ||
             label.toLowerCase().includes('mexican'))
          );
          
          if (isSpanish) {
            language = 'es';
          }
        }
        
        // Get the sample text for this voice based on detected language
        let sampleText = language === 'es' 
          ? '¡Hola! ¿Cómo puedo ayudarte hoy?' 
          : 'Hi there, this is a sample of my voice.';
        
        return {
          ...voice,
          language,
          sampleText,
          settings
        };
      } catch (error) {
        console.error(`Error fetching details for voice ${voice.voice_id}:`, error);
        return voice;
      }
    });
    
    const detailedVoices = await Promise.all(detailedVoicesPromises);
    
    return NextResponse.json(detailedVoices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
} 