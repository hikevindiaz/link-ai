import { NextRequest } from 'next/server';
import { getElevenlabsCredentials } from '../credentials/utils';

export const dynamic = 'force-dynamic';

// This function handles WebSocket connections for Text-to-Speech
export async function GET(req: NextRequest) {
  try {
    // Get the API key from credentials
    const { apiKey } = await getElevenlabsCredentials();
    if (!apiKey) {
      return new Response('API key not available', { status: 401 });
    }

    // Get query parameters from the request URL
    const url = new URL(req.url);
    const voiceId = url.searchParams.get('voice_id') || '21m00Tcm4TlvDq8ikWAM';
    const modelId = url.searchParams.get('model_id') || 'eleven_turbo_v2';
    const outputFormat = url.searchParams.get('output_format') || 'mp3_44100_128';

    // Create a WebSocket connection to ElevenLabs
    const elevenlabsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${encodeURIComponent(modelId)}&output_format=${encodeURIComponent(outputFormat)}&optimize_streaming_latency=0&inactivity_timeout=120`;
    
    // Configure headers for WebSocket upgrade
    const headers = new Headers();
    headers.set('Connection', 'Upgrade');
    headers.set('Upgrade', 'websocket');
    headers.set('Sec-WebSocket-Version', '13');
    headers.set('Sec-WebSocket-Key', req.headers.get('Sec-WebSocket-Key') || '');
    headers.set('xi-api-key', apiKey); // Set ElevenLabs API key

    // Copy any other important headers from the original request
    if (req.headers.has('Sec-WebSocket-Extensions')) {
      headers.set('Sec-WebSocket-Extensions', req.headers.get('Sec-WebSocket-Extensions') || '');
    }
    if (req.headers.has('Sec-WebSocket-Protocol')) {
      headers.set('Sec-WebSocket-Protocol', req.headers.get('Sec-WebSocket-Protocol') || '');
    }

    console.log('Proxying WebSocket connection to ElevenLabs:', { voiceId, modelId, outputFormat });

    // Forward the WebSocket upgrade request to ElevenLabs
    const response = await fetch(elevenlabsUrl, {
      method: 'GET',
      headers
    });

    // Return the upgraded connection
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (error) {
    console.error('Error in TTS WebSocket proxy:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 