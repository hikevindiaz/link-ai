import { NextRequest } from 'next/server';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export async function GET(request: NextRequest) {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    return new Response('Deepgram API key not configured', { status: 500 });
  }

  // Create a Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      // Create Deepgram client
      const deepgram = createClient(deepgramApiKey);
      
      // Create live transcription connection
      const live = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        endpointing: 300,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
        filler_words: false,
        punctuate: true,
        profanity_filter: false,
        redact: false,
        diarize: false,
        multichannel: false,
        alternatives: 1,
        numerals: true
      });

      // Handle connection events
      live.addListener(LiveTranscriptionEvents.Open, () => {
        console.log('[Deepgram Stream] Connection opened');
        controller.enqueue(`data: ${JSON.stringify({ type: 'open' })}\n\n`);
      });

      live.addListener(LiveTranscriptionEvents.Transcript, (data) => {
        console.log('[Deepgram Stream] Transcript received:', data);
        controller.enqueue(`data: ${JSON.stringify({ type: 'transcript', data })}\n\n`);
      });

      live.addListener(LiveTranscriptionEvents.SpeechStarted, (speech) => {
        console.log('[Deepgram Stream] Speech started:', speech);
        controller.enqueue(`data: ${JSON.stringify({ type: 'speech_started', data: speech })}\n\n`);
      });

      live.addListener(LiveTranscriptionEvents.UtteranceEnd, (utterance) => {
        console.log('[Deepgram Stream] Utterance ended:', utterance);
        controller.enqueue(`data: ${JSON.stringify({ type: 'utterance_end', data: utterance })}\n\n`);
      });

      live.addListener(LiveTranscriptionEvents.Error, (error) => {
        console.error('[Deepgram Stream] Error:', error);
        controller.enqueue(`data: ${JSON.stringify({ type: 'error', data: error })}\n\n`);
      });

      live.addListener(LiveTranscriptionEvents.Close, () => {
        console.log('[Deepgram Stream] Connection closed');
        controller.enqueue(`data: ${JSON.stringify({ type: 'close' })}\n\n`);
        controller.close();
      });

      // Store the live connection for cleanup
      (controller as any).live = live;
    },
    
    cancel(controller) {
      console.log('[Deepgram Stream] Stream cancelled, cleaning up');
      if ((controller as any).live) {
        (controller as any).live.finish();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  // Handle audio data sent from client
  try {
    const arrayBuffer = await request.arrayBuffer();
    
    // For now, just acknowledge receipt
    // In a full implementation, you'd forward this to the Deepgram connection
    console.log('[Deepgram Stream] Received audio data:', arrayBuffer.byteLength, 'bytes');
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Deepgram Stream] Error handling audio data:', error);
    return new Response('Error', { status: 500 });
  }
} 