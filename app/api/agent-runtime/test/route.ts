import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AgentRuntime, ChannelContext, AgentMessage } from '@/lib/agent-runtime';
import { logger } from '@/lib/logger';

/**
 * Test endpoint for the Unified Agent Runtime
 * This demonstrates how any channel can use the same runtime
 */
export async function POST(req: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      message, 
      chatbotId, 
      threadId,
      channelType = 'web' // Default to web channel
    } = body;
    
    // Validate required fields
    if (!message || !chatbotId || !threadId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, chatbotId, threadId' },
        { status: 400 }
      );
    }
    
    logger.info('Testing agent runtime', { 
      chatbotId, 
      channelType,
      threadId 
    }, 'agent-runtime-test');
    
    // Create agent runtime from chatbot ID
    const runtime = await AgentRuntime.fromChatbotId(chatbotId);
    
    // Define channel capabilities based on type
    const channelCapabilities = {
      web: {
        supportsAudio: false,
        supportsVideo: false,
        supportsImages: true,
        supportsFiles: true,
        supportsRichText: true,
        supportsTypingIndicator: true,
        supportsDeliveryReceipts: false,
        supportsInterruption: false,
        maxMessageLength: 4000
      },
      voice: {
        supportsAudio: true,
        supportsVideo: false,
        supportsImages: false,
        supportsFiles: false,
        supportsRichText: false,
        supportsTypingIndicator: false,
        supportsDeliveryReceipts: false,
        supportsInterruption: true,
        maxAudioDuration: 300 // 5 minutes
      },
      phone: {
        supportsAudio: true,
        supportsVideo: false,
        supportsImages: false,
        supportsFiles: false,
        supportsRichText: false,
        supportsTypingIndicator: false,
        supportsDeliveryReceipts: false,
        supportsInterruption: true,
        maxAudioDuration: 600 // 10 minutes
      },
      whatsapp: {
        supportsAudio: true,
        supportsVideo: true,
        supportsImages: true,
        supportsFiles: true,
        supportsRichText: true,
        supportsTypingIndicator: true,
        supportsDeliveryReceipts: true,
        supportsInterruption: false,
        maxMessageLength: 4096
      }
    };
    
    // Create channel context
    const channelContext: ChannelContext = {
      type: channelType,
      sessionId: `${channelType}-${threadId}`,
      userId: session.user.id,
      chatbotId,
      threadId,
      capabilities: channelCapabilities[channelType] || channelCapabilities.web,
      metadata: {
        userAgent: req.headers.get('user-agent'),
        userIP: req.headers.get('x-forwarded-for') || 'unknown'
      }
    };
    
    // Create user message
    const userMessage: AgentMessage = {
      id: `test_${Date.now()}`,
      role: 'user',
      content: message,
      type: 'text',
      timestamp: new Date()
    };
    
    // Process message through the runtime
    const response = await runtime.processMessage(
      userMessage,
      channelContext
    );
    
    // Get conversation history for debugging
    const conversationManager = runtime.getConversationManager();
    const conversation = await conversationManager.getConversation(channelContext.sessionId);
    
    return NextResponse.json({
      success: true,
      response: {
        content: response.content,
        type: response.type,
        timestamp: response.timestamp
      },
      debug: {
        channelType,
        sessionId: channelContext.sessionId,
        messageCount: conversation?.messages.length || 0,
        capabilities: channelContext.capabilities
      }
    });
    
  } catch (error) {
    logger.error('Error in agent runtime test', { 
      error: error.message 
    }, 'agent-runtime-test');
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 