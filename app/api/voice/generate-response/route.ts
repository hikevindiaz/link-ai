import { NextRequest, NextResponse } from 'next/server';
import { AgentRuntime } from '@/lib/agent-runtime';
import { ChannelContext, MessageProcessingInput, AgentMessage } from '@/lib/agent-runtime/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatbotId, messages, threadId } = body;

    if (!chatbotId) {
      return new Response('Missing chatbotId', { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response('Missing or invalid messages', { status: 400 });
    }

    console.log(`[Voice Response] Processing ${messages.length} messages for chatbot ${chatbotId} (VOICE OPTIMIZED)`);

    // Initialize Agent Runtime - but skip heavy vector processing for voice
    const agentRuntime = await AgentRuntime.fromChatbotId(chatbotId, {
      type: 'voice',  // Mark as voice to potentially skip heavy processing
      sessionId: threadId || `voice-session-${Date.now()}`,
      userId: 'voice-user',
      chatbotId: chatbotId,
      threadId: threadId || `voice-thread-${Date.now()}`,
      capabilities: {
        supportsAudio: true,
        supportsVideo: false,
        supportsImages: false,
        supportsFiles: false,
        supportsRichText: false,
        supportsTypingIndicator: false,
        supportsDeliveryReceipts: false,
        supportsInterruption: true,
        maxMessageLength: 1000  // Shorter for voice
      }
    });

    console.log(`[Voice Response] Agent Runtime initialized for voice`);

    // Convert messages to AgentMessage format
    const agentMessages: AgentMessage[] = messages.map((msg: any, index: number) => ({
      id: msg.id || `voice-msg-${Date.now()}-${index}`,
      role: msg.role,
      content: msg.content,
      type: 'text',
      timestamp: new Date(msg.timestamp || Date.now())
    }));

    // STREAMING APPROACH: Optimized for voice with immediate response
    console.log(`[Voice Response] Starting voice-optimized streaming...`);
    
    let fullResponse = '';
    const startTime = Date.now();
    
    // Create a streaming response using Node.js approach
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        console.log(`[Voice Response] Voice stream started at ${Date.now() - startTime}ms`);
        
        try {
          // Create lightweight input for voice processing
          const messageInput = {
            threadId: threadId || `voice-${Date.now()}`,
            messages: agentMessages
          };
          
          // Create voice-optimized channel context
          const channelContext = {
            type: 'voice' as const,
            userId: 'voice-user',
            sessionId: threadId || `voice-session-${Date.now()}`,
            chatbotId: chatbotId,
            threadId: threadId || `voice-${Date.now()}`,
            capabilities: {
              supportsAudio: true,
              supportsVideo: false,
              supportsImages: false,
              supportsFiles: false,
              supportsRichText: false,
              supportsTypingIndicator: false,
              supportsDeliveryReceipts: false,
              supportsInterruption: true,
              maxMessageLength: 1000
            },
            metadata: {
              voiceOptimized: true,  // Flag for runtime to skip heavy processing
              skipVectorSearch: true // Explicitly skip vector search for speed
            }
          };
          
          // Create streaming response handler with immediate flushing
          const streamingResponse = {
            onToken: (token: string) => {
              try {
                // Immediately send each token for low latency
                controller.enqueue(encoder.encode(token));
                fullResponse += token;
                if (token.trim()) {
                  console.log(`[Voice Response] Token: "${token.substring(0, 20)}..." (${token.length} chars)`);
                }
              } catch (error) {
                console.error('[Voice Response] Stream encoding error:', error);
              }
            },
            onComplete: (finalResponse?: string) => {
              console.log(`[Voice Response] Stream completed at ${Date.now() - startTime}ms. Length: ${finalResponse?.length || fullResponse.length}`);
              if (finalResponse) fullResponse = finalResponse;
              controller.close();
            },
            onError: (error: any) => {
              console.error('[Voice Response] Stream error:', error);
              const errorMessage = 'I apologize, but I had trouble processing that. Could you please try again?';
              controller.enqueue(encoder.encode(errorMessage));
              controller.close();
            }
          };
          
          // Process voice response - should be much faster without heavy vector search
          await agentRuntime.processMessages(
            messageInput,
            channelContext,
            streamingResponse
          );
          
          console.log(`[Voice Response] Voice processing completed in ${Date.now() - startTime}ms`);
          
        } catch (error) {
          console.error('[Voice Response] Processing error:', error);
          const errorMessage = 'I apologize, but I had trouble processing that. Could you please try again?';
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        }
      },
      cancel() {
        console.log(`[Voice Response] Voice stream cancelled by client`);
      }
    });

    // Return streaming response with proper headers
    return new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no', // Disable nginx buffering for real-time streaming
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('[Voice Response] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process voice request', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 