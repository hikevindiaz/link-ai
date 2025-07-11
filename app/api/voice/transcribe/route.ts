import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';

export async function POST(request: NextRequest) {
  try {
    const { audio, sampleRate = 16000, channels = 1, encoding = 'linear16' } = await request.json();

    if (!audio) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 });
    }

    console.log('[Deepgram Transcribe] Processing audio transcription...');
    const startTime = performance.now();

    // Create Deepgram client
    const deepgram = createClient(deepgramApiKey);

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    console.log(`[Deepgram Transcribe] Audio buffer size: ${audioBuffer.length} bytes`);

    // Use Deepgram's prerecorded transcription API
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        paragraphs: false,
        utterances: false,
        encoding: encoding as any,
        sample_rate: sampleRate,
        channels: channels,
      }
    );

    if (error) {
      console.error('[Deepgram Transcribe] Transcription error:', error);
      return NextResponse.json({ 
        error: 'Transcription failed', 
        details: error 
      }, { status: 500 });
    }

    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
    
    const duration = performance.now() - startTime;
    console.log(`[Deepgram Transcribe] ✅ Transcription completed in ${duration.toFixed(2)}ms`);
    console.log(`[Deepgram Transcribe] Result: "${transcript}" (confidence: ${confidence})`);

    return NextResponse.json({
      transcript,
      confidence,
      duration: duration,
      success: true
    });

  } catch (error) {
    console.error('[Deepgram Transcribe] Error:', error);
    return NextResponse.json({
      error: 'Failed to transcribe audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 