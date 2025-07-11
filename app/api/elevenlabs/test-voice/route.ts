import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received request body:', body);
    
    const { text, voiceId, language } = body;

    if (!text?.trim()) {
      console.log('Text validation failed:', text);
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!voiceId?.trim()) {
      console.log('VoiceId validation failed:', voiceId);
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      console.log('API key not configured');
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    // Use the multilingual model - it automatically detects language
    const modelId = 'eleven_multilingual_v2';

    const requestBody = {
      text: text.trim(),
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
      // Removed language_code parameter as the model doesn't support it
    };

    console.log('Sending to ElevenLabs:', {
      voiceId,
      requestBody,
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
    });

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        voiceId,
        requestBody
      });
      return NextResponse.json({ 
        error: 'Failed to generate speech',
        details: errorText,
        status: response.status 
      }, { status: response.status });
    }

    console.log('ElevenLabs API success for voice:', voiceId);
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error in test voice endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 