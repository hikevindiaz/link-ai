import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { getThreadMessages } from '@/lib/chat-interface/adapters';
import { StreamingTextResponse } from '@/lib/chat-interface/ai/compatibility';

export const runtime = 'edge';

// Create an OpenAI API client (edge-compatible)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { messages, chatbotId } = await req.json();

    if (!messages || !chatbotId) {
      return new Response('Missing messages or chatbotId', { status: 400 });
    }

    // Fetch chatbot details using REST API
    const chatbotResponse = await fetch(`${req.headers.get('origin')}/api/chatbots/${chatbotId}`, {
      headers: {
        'Cookie': req.headers.get('cookie') || '',
        'Referer': req.headers.get('referer') || '',
      }
    });
    
    if (!chatbotResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Chatbot not found' }), 
        { status: 404 }
      );
    }
    
    const chatbot = await chatbotResponse.json();

    // Get the model name from the chatbot's model relation
    let modelName = 'gpt-4o-mini'; // Default model
    if (chatbot.model && chatbot.model.name) {
      modelName = chatbot.model.name;
    }

    // Fetch knowledge sources
    const knowledgeSourcesResponse = await fetch(
      `${req.headers.get('origin')}/api/knowledge-sources?chatbotId=${chatbotId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.get('cookie') || '',
          'Referer': req.headers.get('referer') || '',
        },
      }
    );

    let knowledgeSources = [];
    if (knowledgeSourcesResponse.ok) {
      const data = await knowledgeSourcesResponse.json();
      knowledgeSources = Array.isArray(data) ? data : [];
    }

    // Get chatbot knowledge if available
    let knowledge = '';
    try {
      knowledge = knowledgeSources.map((source: any) => {
        let sourceKnowledge = '';
        if (source.textContents) {
          sourceKnowledge += source.textContents.map((text: any) => text.content).join('\n');
        }
        if (source.websiteContents) {
          sourceKnowledge += source.websiteContents.map((web: any) => `Content from ${web.url}`).join('\n');
        }
        if (source.qaContents) {
          sourceKnowledge += source.qaContents.map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n');
        }
        return sourceKnowledge;
      }).join('\n\n');
    } catch (error) {
      console.error('Error fetching knowledge:', error);
      // Continue without knowledge if there's an error
    }

    // Combine the chatbot's prompt with knowledge and messages
    const systemPrompt = chatbot.prompt || 'You are a helpful AI assistant.';
    const fullPrompt = knowledge 
      ? `${systemPrompt}\n\nHere is relevant knowledge to help answer questions:\n${knowledge}`
      : systemPrompt;

    const fullMessages = [
      { role: 'system', content: fullPrompt },
      ...messages
    ];

    // Create chat completion with OpenAI
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: fullMessages,
      temperature: chatbot.temperature || 0.7,
      max_tokens: chatbot.maxCompletionTokens || 1000,
      stream: true,
    });

    // Convert the response to a stream using Vercel AI SDK
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              // Send text chunks directly for text protocol
              controller.enqueue(encoder.encode(text));
            }
          }
          // No need to send [DONE] marker for text protocol
        } catch (error) {
          console.error('Error in stream processing:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    // Return the streaming response with the correct headers for text protocol
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
  } catch (error) {
    console.error('Error in chat completion:', error);
    if (error instanceof OpenAI.APIError) {
      const { name, status, headers, message } = error;
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API Error',
          message,
          status,
          type: name
        }), 
        { status: status || 500 }
      );
    }
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { status: 500 }
    );
  }
}

// GET handler to retrieve chat history
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const threadId = url.searchParams.get('id');
    
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }
    
    const messages = await getThreadMessages(threadId);
    return NextResponse.json({ messages, id: threadId });
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 