import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AgentRuntime } from '@/lib/agent-runtime';
import { AgentMessage, ChannelContext } from '@/lib/agent-runtime/types';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatbotId, message, sessionConfig } = await req.json();

    if (!chatbotId || !message) {
      return NextResponse.json({ error: 'Missing chatbotId or message' }, { status: 400 });
    }

    // Create agent runtime from chatbot ID
    const runtime = await AgentRuntime.fromChatbotId(chatbotId);

    // Create user message
    const userMessage: AgentMessage = {
      id: `voice_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: message,
      type: 'text', // Use 'text' type since voice transcripts are text content
      timestamp: new Date(),
      metadata: {
        channel: 'voice',
        originalType: 'voice',
        voiceTranscript: true
      }
    };

    // Create voice channel context
    const channelContext: ChannelContext = {
      type: 'voice',
      sessionId: `voice_${session.user.id}_${chatbotId}`,
      userId: session.user.id,
      chatbotId,
      threadId: `voice_chat_${chatbotId}_${session.user.id}`,
      capabilities: {
        supportsAudio: true,
        supportsVideo: false,
        supportsImages: false,
        supportsFiles: false,
        supportsRichText: false,
        supportsTypingIndicator: false,
        supportsDeliveryReceipts: false,
        supportsInterruption: false,
        maxMessageLength: 1000 // Voice messages should be concise
      },
      metadata: {
        voiceSession: true,
        sessionConfig: sessionConfig,
        userAgent: req.headers.get('user-agent'),
        userIP: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      }
    };

    // Process message through agent runtime
    const assistantMessage = await runtime.processMessage(
      userMessage,
      channelContext
    );

    console.log(`[Voice AI] Generated response for chatbot ${chatbotId}: ${assistantMessage.content.substring(0, 100)}...`);

    // Save both messages to database for text chat continuity
    await saveVoiceMessagesToDatabase(userMessage, assistantMessage, channelContext);

    return NextResponse.json({ 
      response: assistantMessage.content,
      messageId: assistantMessage.id 
    });

  } catch (error) {
    console.error('[Voice AI] Error generating response:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}

/**
 * Save voice messages to database for text chat continuity
 * Uses the existing Message model structure (message + response in one record)
 */
async function saveVoiceMessagesToDatabase(
  userMessage: AgentMessage,
  assistantMessage: AgentMessage,
  context: ChannelContext
): Promise<void> {
  try {
    // Create a single message record with both user input and assistant response
    // This matches the existing Message model structure
    await prisma.message.create({
      data: {
        message: userMessage.content, // User's voice transcript
        response: assistantMessage.content, // Assistant's response
        threadId: context.threadId,
        from: 'voice', // Indicate this came from voice channel
        userId: context.userId,
        chatbotId: context.chatbotId,
        userIP: context.metadata?.userIP || null,
        read: false
      }
    });

    console.log(`[Voice DB] Saved voice conversation to thread ${context.threadId}`);

  } catch (error) {
    console.error('[Voice DB] Error saving voice messages:', error);
    // Don't throw error - voice should continue working even if DB save fails
  }
} 