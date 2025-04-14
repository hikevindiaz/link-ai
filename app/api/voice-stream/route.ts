import { NextResponse } from 'next/server';

/**
 * API endpoint to proxy TTS requests from browser to ElevenLabs WebSocket
 * This helps avoid CORS and WebSocket connection issues
 */
export async function POST(request: Request) {
  try {
    // Get API key from environment
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsApiKey) {
      console.error('[Voice Stream API] Missing ElevenLabs API key');
      return NextResponse.json(
        { error: 'Voice services not configured' },
        { status: 500 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }
    
    console.log('[Voice Stream API] Processing TTS request for:', text.substring(0, 50) + '...');
    
    // Make HTTP request to ElevenLabs (HTTP is more reliable than WebSocket from server-side)
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );
    
    if (!elevenLabsResponse.ok) {
      console.error(
        '[Voice Stream API] Error from ElevenLabs:',
        elevenLabsResponse.status,
        await elevenLabsResponse.text()
      );
      return NextResponse.json(
        { error: 'Error from speech service' },
        { status: elevenLabsResponse.status }
      );
    }
    
    // Get audio data as ArrayBuffer
    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    
    // Create a readable stream for the response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('[Voice Stream API] Error processing TTS request:', error);
    return NextResponse.json(
      { error: 'Failed to process text-to-speech request' },
      { status: 500 }
    );
  }
} 