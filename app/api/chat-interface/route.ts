import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { getThreadMessages } from '@/lib/chat-interface/adapters';
import { StreamingTextResponse } from '@/lib/chat-interface/ai/compatibility';
import { db } from '@/lib/db';

export const runtime = 'edge';

// Create an OpenAI API client (edge-compatible)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { messages, chatbotId, userLocation } = await req.json();

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
    let vectorStoreIds = [];
    let hasWebsiteUrls = false;
    let websiteUrls: string[] = [];
    
    if (knowledgeSourcesResponse.ok) {
      const data = await knowledgeSourcesResponse.json();
      knowledgeSources = Array.isArray(data) ? data : [];
      
      // Extract vector store IDs
      vectorStoreIds = knowledgeSources
        .filter(source => source.vectorStoreId)
        .map(source => source.vectorStoreId);
      
      // Check for website URLs that can be searched live
      for (const source of knowledgeSources) {
        if (source.websiteContents && source.websiteContents.length > 0) {
          // Filter for websites marked for live search (no searchType means using the website
          // for crawling, not for live search)
          const liveSearchUrls = source.websiteContents.map((web: any) => web.url);
          
          if (liveSearchUrls.length > 0) {
            hasWebsiteUrls = true;
            websiteUrls = [...websiteUrls, ...liveSearchUrls];
          }
        }
      }
    }

    // Define which tools to use based on available knowledge
    const useFileSearch = vectorStoreIds.length > 0;
    const useWebSearch = hasWebsiteUrls && websiteUrls.length > 0;
    
    // Get chatbot knowledge if available - only needed if not using file_search or web_search
    let knowledge = '';
    if (!useFileSearch && !useWebSearch) {
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
    }

    // Combine the chatbot's prompt with knowledge and messages
    let systemPrompt = chatbot.prompt || 'You are a helpful AI assistant.';
    
    // Create a formatted list of allowed URLs for web search
    let authorizedDomains = '';
    if (useWebSearch && websiteUrls.length > 0) {
      // Extract domains from URLs for clearer presentation
      const domains = websiteUrls.map(url => {
        try {
          const urlObj = new URL(url);
          return urlObj.hostname;
        } catch (e) {
          return url;
        }
      });
      
      // Remove duplicates
      const uniqueDomains = Array.from(new Set(domains));
      authorizedDomains = uniqueDomains.join(', ');
      
      // Add instructions for web search
      systemPrompt += `\n\nYou have access to search these specific websites for current information when relevant: ${authorizedDomains}.`;
    }
    
    // Add context about knowledge base access without mentioning uploads
    if (useFileSearch) {
      systemPrompt += `\n\nYou have access to a curated knowledge base to help answer questions accurately. Use this information when relevant to provide precise answers.`;
    }
    
    const fullPrompt = !useFileSearch && !useWebSearch && knowledge
      ? `${systemPrompt}\n\nHere is relevant knowledge to help answer questions:\n${knowledge}`
      : systemPrompt;

    // Prepare messages for the Responses API - convert format from Chat Completions to Responses
    // The Responses API accepts a string 'input' and a system_prompt parameter instead of messages array
    const userInput = messages.filter((msg: any) => msg.role === 'user').pop()?.content || "";
    
    // Configure web search options
    let webSearchOptions = {};
    if (useWebSearch) {
      webSearchOptions = {
        search_context_size: "medium" // Could be "low", "medium", or "high"
      };
      
      // If user location is provided, add it to the web search options
      if (userLocation) {
        webSearchOptions = {
          ...webSearchOptions,
          user_location: {
            type: "approximate",
            ...userLocation
          }
        };
      }
    }

    let response;
    
    try {
      const tools = [];
      
      // Add tools based on available knowledge
      if (useFileSearch) {
        tools.push({ 
          type: "file_search",
          vector_store_ids: vectorStoreIds
        });
      }
      
      if (useWebSearch) {
        tools.push({ 
          type: "web_search_preview",
          ...webSearchOptions
        });
      }
      
      // Set up tool resources for file_search if needed
      const toolResources = useFileSearch ? {
        file_search: {
          vector_store_ids: vectorStoreIds
        }
      } : undefined;
      
      // Use the Responses API which properly supports file_search and web_search_preview
      response = await openai.responses.create({
        model: modelName,
        instructions: fullPrompt,
        input: userInput,
        temperature: chatbot.temperature || 0.7,
        max_output_tokens: chatbot.maxCompletionTokens || 1000,
        stream: true,
        tools: tools.length > 0 ? tools : undefined,
        // Removing tool_resources as it's not supported
        // tool_resources: toolResources,
        // Optionally force the model to use the right tools when needed
        tool_choice: tools.length > 0 ? "auto" : undefined
      } as any); // Use type assertion to bypass TS errors with the OpenAI SDK
      
    } catch (error) {
      console.error('Error in OpenAI API call:', error);
      
      // Check if it's a tool-related error
      if (error instanceof OpenAI.APIError) {
        const { message, status } = error;
        
        // Specific handling for web search errors
        if (message.includes('web_search') || message.includes('search')) {
          return new Response(
            JSON.stringify({ 
              error: 'Web Search Error',
              message: 'There was an issue with the web search functionality. Trying again without web search.',
              status
            }), 
            { status: 500 }
          );
        }
        
        // Specific handling for file search errors
        if (message.includes('file_search') || message.includes('vector_store')) {
          return new Response(
            JSON.stringify({ 
              error: 'Knowledge Base Error',
              message: 'There was an issue accessing the knowledge base. Trying again with standard response.',
              status
            }), 
            { status: 500 }
          );
        }
      }
      
      // Re-throw for general error handling
      throw error;
    }

    // Convert the response to a stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // When using the Vercel AI SDK with streamProtocol: 'text',
        // we need to format the response as raw text with no JSON structures
        try {
          // Handle streaming from the Responses API
          for await (const chunk of response) {
            // Debug response structure
            console.log('Response chunk type:', chunk.type);
            
            // Handle response.output_text.delta chunks - this is the main content
            if (chunk.type === 'response.output_text.delta') {
              // For direct string values in the delta property
              if (typeof chunk.delta === 'string') {
                controller.enqueue(encoder.encode(chunk.delta));
              } 
              // Object with text property (less common)
              else if (chunk.delta && typeof chunk.delta.text === 'string') {
                controller.enqueue(encoder.encode(chunk.delta.text));
              }
              // Object with value property (some versions)
              else if (chunk.delta && chunk.delta.value) {
                controller.enqueue(encoder.encode(chunk.delta.value));
              }
            } 
            // Handle other chunk types as fallbacks
            else if (chunk.type === 'message_delta' && chunk.delta?.content?.[0]?.text) {
              controller.enqueue(encoder.encode(chunk.delta.content[0].text));
            } else if (chunk.type === 'message' && chunk.content?.[0]?.text) {
              controller.enqueue(encoder.encode(chunk.content[0].text));
            } else if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            } else if (chunk.delta?.text) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (error) {
          console.error('Error in stream processing:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    // Return the stream with appropriate headers for SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff'
      }
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