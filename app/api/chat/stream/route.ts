import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Streaming LLM endpoint for low-latency voice conversations
 * Accepts partial or complete user messages and streams response tokens
 */
export async function POST(req: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { message, chatbotId, partial = false } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }
    
    // Prepare response stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get chatbot information for context
          const chatbotResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/chatbots/${chatbotId}`);
          const chatbot = await chatbotResponse.json();
          
          // Add system context based on chatbot configuration
          const systemPrompt = chatbot?.systemPrompt || 
            "You are a helpful, concise voice assistant. Respond in a clear and conversational way.";
          
          // If partial is true, we're processing incomplete user speech
          // Adjust model behavior accordingly
          const partialPrompt = partial 
            ? "The user's message is still being transcribed. Interpret it as best you can and start formulating a response, but don't respond to ambiguous requests yet."
            : "";
          
          // Create messages array for the LLM with proper types
          const messages = [
            { role: "system" as const, content: systemPrompt + (partial ? `\n${partialPrompt}` : "") },
            { role: "user" as const, content: message }
          ];
          
          // Stream response from OpenAI
          const completion = await openai.chat.completions.create({
            model: chatbot?.model || "gpt-4.1-mini-2025-04-14",
            messages,
            stream: true,
            temperature: partial ? 0.3 : 0.7, // Lower temp for partial transcripts
            max_tokens: partial ? 100 : 300,  // Limit tokens for partial responses
          });
          
          // Stream tokens as they arrive
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // Send content chunk to client
              controller.enqueue(encoder.encode(content));
            }
          }
          
          // Signal completion
          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          controller.error(error);
        }
      }
    });
    
    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error("Stream endpoint error:", error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
} 