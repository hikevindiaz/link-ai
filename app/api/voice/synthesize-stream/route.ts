import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { text, chatbotId, voice } = await req.json();

    if (!text) {
      return new Response('Missing text', { status: 400 });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return new Response('ElevenLabs API key not configured', { status: 500 });
    }

    console.log(`[ElevenLabs Streaming TTS] Starting for: "${text.substring(0, 50)}..."`);
    const startTime = Date.now();

    // Map voice or use default
    const voiceId = mapVoiceToElevenLabs(voice) || 'pNInz6obpgDQGcFmaJgB'; // Adam voice

    // Create streaming response
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          console.log(`[ElevenLabs Streaming] Starting stream for voice: ${voiceId}`);
          console.log(`[ElevenLabs Streaming] API Key present: ${!!process.env.ELEVENLABS_API_KEY}`);
          console.log(`[ElevenLabs Streaming] Text length: ${text.length}`);
          
          // Use ElevenLabs direct API for streaming with max latency optimizations
          const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4&output_format=mp3_44100_128`;
          console.log(`[ElevenLabs Streaming] Calling: ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': process.env.ELEVENLABS_API_KEY!
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_turbo_v2_5', // Turbo model for speed
              voice_settings: {
                stability: 0.3,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          });

          if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[ElevenLabs Streaming] API Error: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorBody}`);
          }
          
          console.log(`[ElevenLabs Streaming] Response OK, starting to stream chunks...`);

          if (!response.body) {
            throw new Error('No response body from ElevenLabs');
          }

          let totalChunks = 0;
          const reader = response.body.getReader();
          
          // Stream audio chunks as they come
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) break;
              
              if (value) {
                controller.enqueue(value);
                totalChunks++;
                if (totalChunks === 1) {
                  console.log(`[ElevenLabs Streaming] First chunk received in ${Date.now() - startTime}ms`);
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
          
          console.log(`[ElevenLabs Streaming] Completed: ${totalChunks} chunks in ${Date.now() - startTime}ms`);
          controller.close();
          
        } catch (error) {
          console.error('[ElevenLabs Streaming] Error:', error);
          controller.error(error);
        }
      },
      cancel() {
        console.log('[ElevenLabs Streaming] Stream cancelled by client');
      }
    });

    return new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('[ElevenLabs Streaming TTS] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate streaming audio', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Map common voice names to ElevenLabs voice IDs
 */
function mapVoiceToElevenLabs(voice?: string): string {
  const voiceMap: Record<string, string> = {
    // Map common OpenAI voice names to ElevenLabs equivalents
    'alloy': 'pNInz6obpgDQGcFmaJgB',   // Adam (male, deep)
    'echo': 'VR6AewLTigWG4xSOukaG',    // Arnold (male, crisp)
    'fable': 'ErXwobaYiN019PkySvjV',   // Antoni (male, well-rounded)
    'onyx': 'yoZ06aMxZJJ28mfd3POQ',    // Sam (male, raspy)
    'nova': 'EXAVITQu4vr4xnSDxMaL',   // Bella (female, expressive)
    'shimmer': 'MF3mGyEYCl7XYWbV9V6O', // Elli (female, emotional)
    
    // ElevenLabs native voices
    'adam': 'pNInz6obpgDQGcFmaJgB',
    'antoni': 'ErXwobaYiN019PkySvjV', 
    'arnold': 'VR6AewLTigWG4xSOukaG',
    'bella': 'EXAVITQu4vr4xnSDxMaL',
    'elli': 'MF3mGyEYCl7XYWbV9V6O',
    'josh': 'TxGEqnHWrfWFTfGW9XjX',
    'rachel': '21m00Tcm4TlvDq8ikWAM',
    'sam': 'yoZ06aMxZJJ28mfd3POQ'
  };

  return voiceMap[voice?.toLowerCase() || 'adam'] || 'pNInz6obpgDQGcFmaJgB';
} 