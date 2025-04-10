import { NextRequest } from 'next/server';
import { getElevenlabsCredentials } from '../credentials/utils';

export const dynamic = 'force-dynamic';

// This function handles WebSocket connections
export async function GET(req: NextRequest) {
  // NextJS doesn't have built-in WebSocket handling, so we use streams for proxying
  const { readable, writable } = new TransformStream();
  
  // Secure access to the API key
  const { apiKey } = await getElevenlabsCredentials();
  if (!apiKey) {
    return new Response('API key not available', { status: 401 });
  }

  // Get query parameters from the request URL
  const url = new URL(req.url);
  const modelId = url.searchParams.get('model_id') || 'eleven_multilingual_v2';
  const sampleRate = url.searchParams.get('sample_rate') || '16000';

  try {
    // Create a WebSocket connection to ElevenLabs
    const elevenlabsUrl = `wss://api.elevenlabs.io/v1/speech-to-text?model_id=${encodeURIComponent(modelId)}&sample_rate=${encodeURIComponent(sampleRate)}`;
    
    // Set up connection to ElevenLabs with proper headers
    const response = await fetch(elevenlabsUrl, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': req.headers.get('Sec-WebSocket-Key') || '',
        'Sec-WebSocket-Extensions': req.headers.get('Sec-WebSocket-Extensions') || '',
        'xi-api-key': apiKey, // Add ElevenLabs API key as header
      },
      method: 'GET',
      // @ts-ignore - duplex is a valid option but not typed correctly
      duplex: 'half',
    });

    // Proxy the response back to the client
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
  } catch (error) {
    console.error('STT WebSocket proxy error:', error);
    return new Response('Error connecting to ElevenLabs API', { status: 500 });
  }
} 