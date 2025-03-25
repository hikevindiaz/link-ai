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
    const isEmbedded = req.headers.get('referer')?.includes('/embed/');

    if (!messages || !chatbotId) {
      return new Response('Missing messages or chatbotId', { status: 400 });
    }

    // Fetch chatbot details using REST API
    const chatbotResponse = await fetch(`${req.headers.get('origin')}/api/chatbots/${chatbotId}`, {
      headers: {
        'Cookie': req.headers.get('cookie') || '',
        'Referer': req.headers.get('referer') || '', // Pass the referer to maintain embedded context
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

    // Get chatbot knowledge if available
    let knowledge = '';
    try {
      // Fetch knowledge sources using REST API with embedded context
      const knowledgeResponse = await fetch(
        `${req.headers.get('origin')}/api/knowledge-sources?chatbotId=${chatbotId}`,
        {
          headers: {
            'Cookie': req.headers.get('cookie') || '',
            'Referer': req.headers.get('referer') || '', // Pass the referer
          }
        }
      );
      
      if (knowledgeResponse.ok) {
        const knowledgeSources = await knowledgeResponse.json();
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
      }
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

    // Return streaming response
    return new StreamingTextResponse(response.body);
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        message: error instanceof Error ? error.message : String(error),
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