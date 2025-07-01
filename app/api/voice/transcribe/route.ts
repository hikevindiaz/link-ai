import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ProviderFactory } from '@/lib/agent-runtime/provider-factory';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const chatbotId = formData.get('chatbotId') as string;

    if (!audioFile || !chatbotId) {
      return NextResponse.json({ error: 'Missing audio file or chatbotId' }, { status: 400 });
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

    // Determine which STT service to use
    const modelName = chatbot.model?.name || 'gpt-4o-mini';
    const provider = ProviderFactory.getProviderFromModel(modelName);
    const useGoogleSTT = provider === 'gemini' && process.env.GOOGLE_AI_API_KEY;

    let transcript: string;

    if (useGoogleSTT) {
      transcript = await transcribeWithGoogleSTT(audioFile, chatbot);
    } else if (process.env.OPENAI_API_KEY) {
      transcript = await transcribeWithOpenAISTT(audioFile, chatbot);
    } else {
      return NextResponse.json({ error: 'No STT service available' }, { status: 500 });
    }

    console.log(`[Voice STT] Transcribed audio for chatbot ${chatbotId}: ${transcript.substring(0, 100)}...`);

    return NextResponse.json({ transcript });

  } catch (error) {
    console.error('[Voice STT] Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

async function transcribeWithOpenAISTT(audioFile: File, chatbot: any): Promise<string> {
  // Convert WebM to format suitable for Whisper
  const audioBuffer = await audioFile.arrayBuffer();
  
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', chatbot.language || 'en');
  formData.append('response_format', 'text');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI STT error: ${response.statusText} - ${error}`);
  }

  return await response.text();
}

async function transcribeWithGoogleSTT(audioFile: File, chatbot: any): Promise<string> {
  // Convert WebM to base64 for Google STT
  const audioBuffer = await audioFile.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');
  
  const requestBody = {
    config: {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 16000,
      languageCode: chatbot.language || 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_short' // Optimized for short audio clips
    },
    audio: {
      content: base64Audio
    }
  };

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google STT error: ${response.statusText} - ${error}`);
  }

  const result = await response.json();
  
  if (result.results && result.results.length > 0) {
    return result.results[0].alternatives[0].transcript;
  }
  
  return '';
} 