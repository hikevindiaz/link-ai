import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AgentRuntime, ChannelContext, AgentMessage, StreamingResponse } from '@/lib/agent-runtime';
import { WebChatAdapter } from '@/lib/agent-runtime/channels/web-adapter';
import { logger } from '@/lib/logger';

/**
 * Streaming chat endpoint using the Unified Agent Runtime
 * Accepts messages and streams response tokens for real-time chat
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
      attachments,
      partial = false 
    } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }
    
    if (!chatbotId || !threadId) {
      return NextResponse.json({ error: 'Missing chatbotId or threadId' }, { status: 400 });
    }
    
    logger.info('Chat stream request', { 
      chatbotId,
      threadId,
      messageLength: message.length,
      partial 
    }, 'chat-stream');
    
    // Create agent runtime
    const runtime = await AgentRuntime.fromChatbotId(chatbotId);
    
    // Create web chat adapter
    const adapter = new WebChatAdapter();
    await adapter.initialize(runtime['config']); // Access private config
    
    // Create channel context
    const channelContext: ChannelContext = {
      type: 'web',
      sessionId: `web-${threadId}`,
      userId: session.user.id,
      chatbotId,
      threadId,
      capabilities: {
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
      metadata: {
        userAgent: req.headers.get('user-agent'),
        userIP: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        partial
      }
    };
    
    // Handle incoming message through adapter
    const userMessage = await adapter.handleIncoming({
      message,
      attachments,
      metadata: { partial }
    }, channelContext);
    
    // Prepare response stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Define streaming callbacks
          const streamingCallbacks: StreamingResponse = {
            onToken: (token: string) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
            },
            onComplete: () => {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
            onError: (error: Error) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
              controller.close();
            }
          };
          
          // Process message through runtime with streaming
          const response = await runtime.processMessage(
            userMessage,
            channelContext,
            streamingCallbacks
          );
          
          // Send the final complete message
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            complete: true, 
            message: response.content 
          })}\n\n`));
          
        } catch (error) {
          logger.error('Error in chat stream', { 
            error: error.message,
            chatbotId,
            threadId 
          }, 'chat-stream');
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            error: 'Error processing message' 
          })}\n\n`));
          controller.close();
        }
      }
    });
    
    // Return streaming response with SSE headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      },
    });
    
  } catch (error) {
    logger.error('Chat stream endpoint error', { 
      error: error.message 
    }, 'chat-stream');
    
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
} 