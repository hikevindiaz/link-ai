import { NextRequest, NextResponse } from 'next/server';
import { AgentRuntime } from '@/lib/agent-runtime';
import { ChannelContext, MessageProcessingInput, AgentMessage, StreamingResponse } from '@/lib/agent-runtime/types';

// Use Node.js runtime for compatibility with dependencies
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatbotId, messages, threadId, userLocation, stream = true } = body;

    if (!chatbotId) {
      return new Response('Missing chatbotId', { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response('Missing or invalid messages', { status: 400 });
    }

    // Initialize Agent Runtime with the chatbot configuration
    const agentRuntime = await AgentRuntime.fromChatbotId(chatbotId, {
      type: 'web',
      sessionId: threadId || `web-session-${Date.now()}`,
      userId: 'anonymous',
      chatbotId: chatbotId,
      threadId: threadId || `web-thread-${Date.now()}`,
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
      userLocation: userLocation || {
        country: 'US',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'America/New_York'
      }
    });

    // Convert messages to AgentMessage format
    const agentMessages: AgentMessage[] = messages.map((msg: any, index: number) => ({
      id: msg.id || `msg-${Date.now()}-${index}`,
      role: msg.role,
      content: msg.content,
      type: 'text',
      timestamp: new Date(msg.timestamp || Date.now())
    }));

    // If streaming is disabled, use the original non-streaming approach
    if (!stream) {
      const input: MessageProcessingInput = {
        threadId: threadId || `web-${Date.now()}`,
        messages: agentMessages
      };

      const channelContext: ChannelContext = {
        type: 'web',
        sessionId: threadId || `web-session-${Date.now()}`,
        userId: 'anonymous',
        chatbotId: chatbotId,
        threadId: threadId || `web-thread-${Date.now()}`,
        capabilities: {
          supportsAudio: false,
          supportsVideo: false,
          supportsImages: false,
          supportsFiles: false,
          supportsRichText: true,
          supportsTypingIndicator: true,
          supportsDeliveryReceipts: false,
          supportsInterruption: false,
          maxMessageLength: 4000
        },
        userLocation: userLocation || {
          country: 'US',
          region: 'Unknown', 
          city: 'Unknown',
          timezone: 'America/New_York'
        }
      };
      
      const assistantMessage = await agentRuntime.processMessages(input, channelContext);
      
      const messageContent = assistantMessage?.content || 'No response generated';
      
      // If tool invocations are present, return as JSON to preserve the data
      if (assistantMessage?.toolInvocations && assistantMessage.toolInvocations.length > 0) {
        return new Response(JSON.stringify({
          content: messageContent,
          toolInvocations: assistantMessage.toolInvocations
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }
      
      return new Response(messageContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // STREAMING APPROACH: Node.js with proper flushing
    let fullResponse = '';
    const startTime = Date.now();
    
    // Create a streaming response using Node.js approach
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Create proper input for processMessages
          const messageInput = {
            threadId: `chat-${Date.now()}`,
            messages: agentMessages.map(msg => ({
              id: msg.id || `msg-${Date.now()}-${Math.random()}`,
              role: msg.role,
              content: msg.content,
              type: 'text' as const,
              timestamp: new Date(msg.timestamp || Date.now())
            }))
          };
          
          // Create channel context
          const channelContext = {
            type: 'web' as const,
            userId: 'chat-interface-user',
            sessionId: `session-${Date.now()}`,
            chatbotId: chatbotId,
            threadId: `chat-${Date.now()}`,
            capabilities: {
              supportsAudio: false,
              supportsVideo: false,
              supportsImages: false,
              supportsFiles: false,
              supportsRichText: true,
              supportsTypingIndicator: true,
              supportsDeliveryReceipts: false,
              supportsInterruption: false,
              maxMessageLength: 4000
            },
            metadata: {}
          };
          
          // Create streaming response handler with immediate flushing
          const streamingResponse = {
            onToken: (token: string) => {
              try {
                // Immediately send each token
                controller.enqueue(encoder.encode(token));
                fullResponse += token;
              } catch (error) {
                // Silent error handling
              }
            },
            onComplete: (finalResponse?: string) => {
              if (finalResponse) fullResponse = finalResponse;
              // Don't close the controller here - we'll do it after sending tool invocations
            },
            onError: (error: any) => {
              const errorMessage = '\n\nI apologize, but I encountered an error processing your request. Please try again.';
              controller.enqueue(encoder.encode(errorMessage));
              controller.close();
            }
          };
          
          // Process AI response using agent runtime (with streaming)
          const assistantMessage = await agentRuntime.processMessages(
            messageInput,
            channelContext,
            streamingResponse
          );

          // If tool invocations are present, send them as a special marker
          if (assistantMessage?.toolInvocations && assistantMessage.toolInvocations.length > 0) {
            const toolInvocationsMarker = `\n\n<!--TOOL_INVOCATIONS:${JSON.stringify(assistantMessage.toolInvocations)}-->\n`;
            controller.enqueue(encoder.encode(toolInvocationsMarker));
          }
          
          // Now close the controller after everything has been sent
          controller.close();
          
        } catch (error) {
          const errorMessage = '\n\nI apologize, but I encountered an error. Please try again.';
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        }
      },
      cancel() {
        // Stream cancelled by client
      }
    });

    // Return streaming response with proper headers for Node.js
    return new Response(readableStream, {
        headers: {
        'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      }
      });

    } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Chat Interface API - Use POST to send messages' });
} 