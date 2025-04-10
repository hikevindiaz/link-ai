import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';

// Ensure API keys are set in your .env file
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

if (!elevenLabsApiKey) {
  console.error("Missing API keys for voice processing (ElevenLabs)");
}

// Initialize clients
const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey! });

export async function POST(req: NextRequest) {
  console.log('Received request for /api/voice-chat (Transcription Only)');
  try {
    // 1. Extract audio
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob | null;

    if (!audioBlob) {
      console.error('No audio blob found in request');
      return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
    }

    // 2. Transcribe audio using ElevenLabs SDK (Correct Method)
    console.log('Transcribing audio with ElevenLabs SDK STT...');
    let transcript = '';
    try {
        const transcriptionResult = await elevenlabs.speechToText.convert({
            file: audioBlob, 
            model_id: 'scribe_v1', // Or appropriate model
        });

        if (transcriptionResult && typeof transcriptionResult.text === 'string') {
            transcript = transcriptionResult.text;
        } else {
            console.warn('Unexpected ElevenLabs STT SDK result structure:', transcriptionResult);
            transcript = ''; 
        }
        console.log('ElevenLabs STT Transcript:', transcript);
    } catch (sttError) {
        console.error('ElevenLabs STT SDK error:', sttError);
        if (sttError instanceof Error) {
            console.error('Error details:', sttError.message, sttError.stack);
        }
        return NextResponse.json({ error: 'Failed to transcribe audio with ElevenLabs SDK' }, { status: 500 });
    }

    if (!transcript) {
        console.log('ElevenLabs returned empty transcript');
        return NextResponse.json({ transcript: '' }, { status: 200 });
    }

    // 5. Return ONLY the transcript
    console.log('Returning transcript from /api/voice-chat');
    return NextResponse.json({
        transcript: transcript,
    });

  } catch (error) {
    console.error('Error in /api/voice-chat:', error);
    return NextResponse.json({ error: 'Internal server error during transcription' }, { status: 500 });
  }
} 