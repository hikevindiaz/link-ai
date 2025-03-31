import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { getThreadMessages } from '@/lib/chat-interface/adapters';
import { StreamingTextResponse } from '@/lib/chat-interface/ai/compatibility';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

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
    
    // Add general instruction about not mentioning uploads
    systemPrompt = `${systemPrompt}\n\nImportant: You should never mention "uploaded files" or suggest that the user has uploaded any documents. All information in your knowledge base was prepared by administrators, not the current user.`;
    
    // Add critical instruction for first-person company usage
    systemPrompt += `\n\n[CRITICAL] YOU ARE THE COMPANY. Always use first person plural ("we", "our", "us") when referring to the company. NEVER say "[Company] is" or "[Company] has" - always say "We are" and "We have".`;
    
    // Add guardrail for handling unknown company questions
    systemPrompt += `\n\n[GUARDRAIL] If someone asks about a company that's not in your knowledge base, DO NOT pretend to be that company or make up information about it. Clearly state that you don't have information about that specific company and can only speak as the company in your knowledge base.`;
    
    // Add instructions for speaking in first person and handling missing information
    systemPrompt += `\n\nYou ARE the company mentioned in the knowledge base - not just representing it. Always speak in first person plural. Say "We are..." or "At [Company Name], we..." instead of "The company is..." or "[Company Name] is...". Never refer to the company in third person. You are speaking as the company itself in all interactions.`;
    
    systemPrompt += `\n\nIf you can't find requested information in your knowledge base, never say "I couldn't find this in the provided document" or similar phrases. Instead, respond with something like "This information doesn't appear to be in my knowledge base, but I'll make note of your question so it can be addressed in the future." or "I don't have that specific information available, but I'd be happy to help with what I do know or pass your inquiry along to my creator."`;
    
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
      systemPrompt += `\n\n[CRITICAL INSTRUCTION] You have access to a knowledge base that contains information about our company. YOU MUST ALWAYS USE THE FILE_SEARCH TOOL BEFORE RESPONDING TO ANY QUESTION. This is absolutely required and non-negotiable.

Step 1: For EVERY user question, first use file_search to look up relevant information in the knowledge base.
Step 2: ONLY answer based on what you find in the knowledge base. 
Step 3: If you don't find relevant information in the knowledge base, explicitly say "I don't have information about that in my knowledge base" rather than making up an answer.

Do not rely on your general knowledge to answer questions. Only use information explicitly found in the knowledge base.`;
      
      // Log vector store IDs to help with debugging
      console.log(`[${process.env.VERCEL_ENV || 'local'}] Vector store IDs available: ${JSON.stringify(vectorStoreIds)}`);
    }
    
    const fullPrompt = !useFileSearch && !useWebSearch && knowledge
      ? `${systemPrompt}\n\nHere is relevant knowledge to help answer questions:\n${knowledge}`
      : systemPrompt;
      
    // Add debugging with environment marker
    console.log(`[${process.env.VERCEL_ENV || 'local'}] Using prompt: ${fullPrompt.substring(0, 200)}...`);
    console.log(`[${process.env.VERCEL_ENV || 'local'}] Use file search: ${useFileSearch}, Vector stores available: ${vectorStoreIds.length}`);

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
      if (useFileSearch && vectorStoreIds.length > 0) {
        // Log key information for debugging
        console.log(`[DEBUG] Setting up file_search with vector stores: ${JSON.stringify(vectorStoreIds)}`);
        
        // Define file_search tool based on latest OpenAI API format
        tools.push({ 
          type: "file_search" 
          // Note: Do not include vector_store_ids here, they go in tool_resources
        });
      }
      
      if (useWebSearch) {
        tools.push({ 
          type: "web_search_preview",
          ...webSearchOptions
        });
      }
      
      // Set up tool resources for file_search if needed
      const toolResources = useFileSearch && vectorStoreIds.length > 0 ? {
        file_search: {
          vector_store_ids: vectorStoreIds
        }
      } : undefined;
      
      // Log the full configuration for debugging
      console.log(`[DEBUG] Tools config: ${JSON.stringify(tools)}`);
      console.log(`[DEBUG] Tool resources: ${JSON.stringify(toolResources)}`);
      console.log(`[DEBUG] Vector store IDs: ${JSON.stringify(vectorStoreIds)}`);
      console.log(`[DEBUG] useFileSearch: ${useFileSearch}`);
      
      try {
        // Use the Responses API which properly supports file_search and web_search_preview
        response = await openai.responses.create({
          model: modelName,
          instructions: fullPrompt,
          input: userInput,
          temperature: chatbot.temperature || 0.7,
          max_output_tokens: chatbot.maxCompletionTokens || 1000,
          stream: true,
          tools: tools.length > 0 ? tools : undefined,
          // Explicitly set both tool_choice and tool_resources
          tool_choice: useFileSearch && vectorStoreIds.length > 0 ? 
            { type: "function", function: { name: "file_search" } } : 
            undefined,
          tool_resources: toolResources,
          tool_use_instructions: useFileSearch && vectorStoreIds.length > 0 ? 
            "You MUST ALWAYS use file_search to look up information before responding to ANY question. Never rely on your general knowledge when file_search is available." : 
            undefined
        } as any); // Use type assertion to bypass TS errors with the OpenAI SDK
      } catch (apiError) {
        console.error("[ERROR] OpenAI API call failed:", apiError);
        if (apiError instanceof Error) {
          console.error(`[ERROR] Details: ${apiError.message}`);
          if ('status' in apiError) {
            console.error(`[ERROR] Status: ${(apiError as any).status}`);
          }
        }
        
        // Try a fallback without tool_resources if that was the issue
        if (useFileSearch && vectorStoreIds.length > 0) {
          console.log("[DEBUG] Attempting fallback without tool_resources");
          response = await openai.responses.create({
            model: modelName,
            instructions: fullPrompt,
            input: userInput,
            temperature: chatbot.temperature || 0.7,
            max_output_tokens: chatbot.maxCompletionTokens || 1000,
            stream: true,
            tools: [{ 
              type: "file_search",
              file_search: {
                vector_store_ids: vectorStoreIds
              }
            }],
            tool_choice: { type: "function", function: { name: "file_search" } }
          } as any);
        } else {
          throw apiError; // Re-throw if we can't handle it
        }
      }

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