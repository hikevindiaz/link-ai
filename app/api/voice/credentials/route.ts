import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API endpoint to fetch voice service credentials
 * Returns WebSocket endpoints and necessary tokens for voice communication
 */
export async function GET() {
  try {
    // Log request for debugging
    console.log('[Voice API] Processing credentials request');
    
    // Get current user session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('[Voice API] Unauthorized request - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get API keys from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    // Log API key presence for debugging (not the actual keys)
    console.log('[Voice API] API Keys present:', {
      openai: !!openaiApiKey,
      elevenLabs: !!elevenLabsApiKey
    });
    
    if (!openaiApiKey || !elevenLabsApiKey) {
      console.log('[Voice API] Missing API keys');
      return NextResponse.json(
        { error: 'Voice services not configured' },
        { status: 500 }
      );
    }
    
    // Generate secure WebSocket endpoints for streaming
    // Use the actual ElevenLabs WebSocket endpoints with proper voice ID parameter
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Default voice ID, should come from user preferences
    
    // Include API keys as query parameters for proper authentication
    const sttEndpoint = `wss://api.openai.com/v1/audio/transcriptions`; // OpenAI uses a different auth method
    const ttsEndpoint = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?api_key=${encodeURIComponent(elevenLabsApiKey)}`; // Include API key directly in URL
    
    // Log sanitized endpoints for debugging (without API keys)
    console.log('[Voice API] Endpoints generated:', {
      stt: sttEndpoint,
      tts: ttsEndpoint.replace(/api_key=([^&]*)/, 'api_key=***')
    });
    
    // Generate secure temporary tokens for client-side usage (not used for WebSocket auth)
    const elevenLabsToken = Buffer.from(`${Date.now()}_${elevenLabsApiKey.substring(0, 8)}`).toString('base64');
    const openaiToken = Buffer.from(`${Date.now()}_${openaiApiKey.substring(0, 8)}`).toString('base64');
    
    // Return credentials and endpoints
    console.log('[Voice API] Returning credentials');
    return NextResponse.json({
      sttEndpoint,
      ttsEndpoint,
      elevenLabsToken,
      openaiToken,
      timestamp: Date.now(),
      sttSessionId: `stt_${Date.now()}`,
      ttsSessionId: `tts_${Date.now()}`
    });
  } catch (error) {
    console.error('[Voice API] Error fetching voice credentials:', error);
    return NextResponse.json(
      { error: 'Failed to initialize voice services' },
      { status: 500 }
    );
  }
} 