import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API endpoint to fetch voice service credentials
 * Returns WebSocket endpoints and necessary tokens for voice communication
 */
export async function GET(request: Request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const chatbotId = url.searchParams.get('chatbotId');
    
    // Log request for debugging
    console.log('[Voice API] Processing credentials request for chatbot:', chatbotId);
    
    // Get current user session
    const session = await getServerSession(authOptions);
    
    // Get API keys from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    // Validate API keys
    if (!openaiApiKey) {
      console.error('[Voice API] Missing OpenAI API key');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    if (!elevenLabsApiKey) {
      console.error('[Voice API] Missing ElevenLabs API key');
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }
    
    // Check that API keys are not malformed (should be non-empty strings)
    if (typeof elevenLabsApiKey !== 'string' || elevenLabsApiKey.trim() === '') {
      console.error('[Voice API] ElevenLabs API key is empty or malformed');
      return NextResponse.json(
        { error: 'ElevenLabs API key is invalid' },
        { status: 500 }
      );
    }

    // Log API key info for debugging
    console.log('[Voice API] ElevenLabs API key found:', {
      present: true,
      length: elevenLabsApiKey.length,
      prefix: elevenLabsApiKey.substring(0, 3) + '...',
      suffix: '...' + elevenLabsApiKey.substring(elevenLabsApiKey.length - 3)
    });

    try {
      // Default voice ID - in a real app, this would come from user preferences
      const voiceId = '21m00Tcm4TlvDq8ikWAM';
      
      // Base WebSocket URL without the API key
      // The API key will be appended by the client
      const ttsEndpoint = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?output_format=mp3_44100_128&model_id=eleven_flash_v2_5`;
      
      console.log('[Voice API] Endpoint generated:', ttsEndpoint);
      
      // Return credentials for client use
      return NextResponse.json({
        ttsEndpoint,
        apiKey: elevenLabsApiKey,
        voiceId,
        timestamp: Date.now(),
        ttsSessionId: `tts_${Date.now()}`
      });
    } catch (endpointError) {
      console.error('[Voice API] Error generating endpoints:', endpointError);
      return NextResponse.json(
        { error: 'Failed to generate voice endpoints' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Voice API] Error fetching voice credentials:', error);
    return NextResponse.json(
      { error: 'Failed to initialize voice services' },
      { status: 500 }
    );
  }
}