import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      model = 'nova-2',
      language = 'en-US',
      smart_format = true,
      interim_results = true,
      utterance_end_ms = 1000,
      vad_events = true,
      endpointing = 300,
      encoding = 'linear16',
      sample_rate = 16000,
      channels = 1
    } = await request.json();

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 });
    }

    // Try a server-side streaming approach instead of client WebSocket
    // This avoids browser WebSocket authentication issues
    return NextResponse.json({ 
      use_server_streaming: true,
      config: {
        model,
        language,
        smart_format,
        interim_results,
        utterance_end_ms,
        vad_events,
        endpointing,
        encoding,
        sample_rate,
        channels
      }
    });

  } catch (error) {
    console.error('[Deepgram WebSocket] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to configure Deepgram connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 