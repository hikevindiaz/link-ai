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

    const { chatbotId } = await req.json();

    if (!chatbotId) {
      return NextResponse.json({ error: 'Missing chatbotId' }, { status: 400 });
    }

    // Get chatbot configuration
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        model: true,
        knowledgeSources: true
      }
    });

    if (!chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    // Check if user owns this chatbot
    if (chatbot.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine which provider to use based on model
    const modelName = chatbot.model?.name || 'gpt-4o-mini';
    const provider = ProviderFactory.getProviderFromModel(modelName);
    
    // Create session configuration
    const sessionConfig = {
      chatbotId: chatbot.id,
      modelName: modelName,
      provider: provider,
      instructions: chatbot.prompt || 'You are a helpful voice assistant. Keep responses concise and conversational.',
      temperature: chatbot.temperature || 0.8,
      maxTokens: 150, // Keep voice responses concise
      voice: chatbot.voice || 'alloy',
      language: chatbot.language || 'en-US',
      
      // Voice-specific settings
      silenceTimeout: 1500, // 1.5 seconds
      maxAudioDuration: 30000, // 30 seconds max per audio chunk
      
      // Available services
      services: {
        stt: provider === 'gemini' ? 'google' : 'openai',
        llm: provider,
        tts: provider === 'gemini' ? 'google' : 'openai'
      },
      
      // API keys (will be used server-side only)
      apiKeys: {
        openai: process.env.OPENAI_API_KEY,
        google: process.env.GOOGLE_AI_API_KEY
      }
    };

    console.log(`[LLM-Agnostic Session] Created session for chatbot ${chatbotId} using ${provider} provider`);

    // Return session config (without API keys for security)
    const clientConfig = {
      ...sessionConfig,
      apiKeys: undefined // Remove API keys from client response
    };

    return NextResponse.json(clientConfig);

  } catch (error) {
    console.error('[LLM-Agnostic Session] Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create voice session' },
      { status: 500 }
    );
  }
} 