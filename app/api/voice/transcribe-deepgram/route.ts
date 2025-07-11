import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createClient } from '@deepgram/sdk';

export async function POST(req: NextRequest) {
  try {
    console.log('[Deepgram STT] POST request received');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('[Deepgram STT] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Deepgram STT] User authenticated:', session.user.id);

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const chatbotId = formData.get('chatbotId') as string;

    console.log('[Deepgram STT] FormData parsed - audioFile size:', audioFile?.size, 'chatbotId:', chatbotId);

    if (!audioFile || !chatbotId) {
      console.log('[Deepgram STT] Missing required fields - audioFile:', !!audioFile, 'chatbotId:', !!chatbotId);
      return NextResponse.json({ error: 'Missing audio file or chatbotId' }, { status: 400 });
    }

    // Check Deepgram API key
    if (!process.env.DEEPGRAM_API_KEY) {
      console.error('[Deepgram STT] DEEPGRAM_API_KEY environment variable not set');
      return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 });
    }

    // Get chatbot configuration
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: { model: true }
    });

    if (!chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // Check if user owns this chatbot
    if (chatbot.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Transcribe with Deepgram Nova-2 (optimized for speed)
    const transcript = await transcribeWithDeepgram(audioFile, chatbot);

    console.log(`[Deepgram Nova-3 STT] Transcribed audio for chatbot ${chatbotId}: ${transcript.substring(0, 100)}...`);

    return NextResponse.json({ transcript });

  } catch (error) {
    console.error('[Deepgram STT] Error transcribing audio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: errorMessage,
        debugInfo: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

async function transcribeWithDeepgram(audioFile: File, chatbot: any): Promise<string> {
  // Create Deepgram client
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
  
  try {
    // Read the file into a buffer - this is the correct way per Deepgram docs
    const audioBuffer = await audioFile.arrayBuffer();
    const audioSource = Buffer.from(audioBuffer);

    // Deepgram Nova-3 configuration optimized for voice chat speed
    const options = {
      model: 'nova-3-general', // Latest model with 53.4% WER reduction
      language: chatbot.language || 'en-US',
      smart_format: true, // Auto punctuation and capitalization
      punctuate: true,
      profanity_filter: false, // Don't filter for business use
      diarize: false, // No speaker separation needed for speed
      ner: false, // No entity recognition for speed  
      summarize: false, // No summarization for speed
      detect_language: false, // Skip language detection for speed
      paragraphs: false, // No paragraph formatting for speed
      utterances: false, // No utterance formatting for speed
      // Voice chat optimizations
      interim_results: false, // Skip interim results for speed
      endpointing: false, // Disable automatic endpointing for faster processing
      channels: 1, // Single channel audio
      multichannel: false, // Disable multichannel processing
    };

    console.log(`[Deepgram Nova-3] Starting transcription for ${audioFile.size} bytes, type: ${audioFile.type}`);
    const startTime = performance.now();

    // Use transcribeFile method with the buffer (as shown in docs)
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioSource,
      options
    );

    const deepgramLatency = performance.now() - startTime;
    console.log(`[Deepgram Nova-3] API call completed in ${deepgramLatency.toFixed(2)}ms`);

    if (error) {
      console.error('[Deepgram Nova-3] SDK Error:', error);
      throw new Error(`Deepgram Nova-3 SDK error: ${error.message || error}`);
    }

    if (!result) {
      console.error('[Deepgram Nova-3] No result returned');
      throw new Error('Deepgram Nova-3 returned no result');
    }

    // Extract transcript from Deepgram response
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    
    if (!transcript) {
      console.warn('[Deepgram Nova-3] No transcript found in result:', JSON.stringify(result, null, 2));
      return '';
    }

    console.log(`[Deepgram Nova-3] Successfully transcribed: ${transcript.substring(0, 100)}...`);
    return transcript;
    
  } catch (error) {
    console.error('[Deepgram Nova-3] Transcription error:', error);
    // Re-throw with more specific error message
    throw new Error(`Deepgram Nova-3 transcription failed: ${error instanceof Error ? error.message : error}`);
  }
} 