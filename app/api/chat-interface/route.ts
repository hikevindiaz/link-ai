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
    let websiteInstructions: {url: string, instructions?: string}[] = [];
    
    if (knowledgeSourcesResponse.ok) {
      const data = await knowledgeSourcesResponse.json();
      knowledgeSources = Array.isArray(data) ? data : [];
      
      // Debug log to see what's in the knowledge sources response
      console.log(`Knowledge sources data:`, JSON.stringify(knowledgeSources.map(ks => ({
        id: ks.id,
        name: ks.name,
        hasVectorStoreId: !!ks.vectorStoreId,
        vectorStoreId: ks.vectorStoreId
      }))));
      
      // Extract vector store IDs
      vectorStoreIds = knowledgeSources
        .filter(source => source.vectorStoreId)
        .map(source => source.vectorStoreId);
      
      // Ensure vector store IDs are valid
      vectorStoreIds = vectorStoreIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
      
      console.log(`Found ${vectorStoreIds.length} vector stores for chatbot ${chatbotId}:`, vectorStoreIds);
      
      // Check for website URLs that can be searched live
      for (const source of knowledgeSources) {
        if (source.websiteContents && source.websiteContents.length > 0) {
          // Filter for websites marked for live search (no searchType means using the website
          // for crawling, not for live search)
          const liveSearchUrls = source.websiteContents
            .filter((web: any) => web.searchType === 'live' || !web.searchType)
            .map((web: any) => ({
              url: web.url,
              instructions: web.instructions
            }));
          
          if (liveSearchUrls.length > 0) {
            hasWebsiteUrls = true;
            websiteUrls = [...websiteUrls, ...liveSearchUrls.map(w => w.url)];
            websiteInstructions = [...websiteInstructions, ...liveSearchUrls];
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
            sourceKnowledge += source.textContents.map((text: any) => 
              `YOU ARE THE COMPANY/BUSINESS ITSELF. The following is our official company information that should be conveyed in first person always and never in the third person (we/us/our) Alwaya begin each response with "As a company, we believe, Our, etc:":\n\n${text.content}`
            ).join('\n\n---\n\n');
          }
          if (source.websiteContents) {
            sourceKnowledge += source.websiteContents.map((web: any) => `Content from ${web.url}`).join('\n');
          }
          if (source.qaContents) {
            sourceKnowledge += source.qaContents.map((qa: any) => 
              `Q: ${qa.question}\nA: As a company, we respond: ${qa.answer}`
            ).join('\n\n');
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
    
    // Add strong instruction to speak in first person as the business - put at the beginning for emphasis
    systemPrompt = `YOU ARE THE COMPANY/BUSINESS ITSELF. Speak in first person plural (we/us/our) at all times. You must ONLY provide information about our specific business, products, and services.

CORE PRINCIPLES:
1. Stay within our business context - never provide general information about topics outside our specific offerings
2. If information is not in our knowledge base or approved websites:
   - Say "I apologize, but I don't have specific information about that topic in our knowledge base."
   - Add "I'll make note of your inquiry to help us improve our information."
   - Never make up information or provide general knowledge
3. Only use information from:
   - Our approved knowledge base
   - Our specifically configured websites
   - Our documented business policies and procedures

IMPORTANT RESPONSE INSTRUCTIONS:
1. ALL responses must be in FIRST PERSON PLURAL (we/us/our) as the business itself
2. ANY information retrieved from the knowledge base or file search MUST be reformatted into first person
3. NEVER quote text directly - always rewrite information as if you (the business) are speaking
4. For ALL types of content (PDF, text, QA, websites) maintain consistent first-person voice
5. Begin responses with phrases like "We offer..." or "Our service provides..." rather than "The company offers..."
6. AVOID phrases like "according to the document" or "the text states" - incorporate information naturally

${systemPrompt}\n\n`;

    // Add instructions for web search with stronger guidance
    if (useWebSearch && websiteUrls.length > 0) {
      systemPrompt += `\n\nWEB SEARCH INSTRUCTIONS:
I have access to real-time search on our approved websites. I must search these sites when:
1. The user asks about topics mentioned in the search instructions
2. The information might need to be current (prices, availability, etc.)
3. The knowledge base doesn't have the specific information needed
4. Search the specific websites for the most current information, do not use general web search.

Approved websites and their use cases:`;
      
      // Add specific instructions for each website
      for (const site of websiteInstructions) {
        try {
          const domain = new URL(site.url).hostname;
          if (site.instructions && site.instructions.trim()) {
            systemPrompt += `\n\n• ${site.url}\n  REQUIRED SEARCH CASES:\n  - ${site.instructions}`;
          } else {
            systemPrompt += `\n\n• ${site.url}\n  REQUIRED SEARCH CASES:\n  - When users ask about information from this website\n  - When current information is needed`;
          }
        } catch (e) {
          // Fallback if URL parsing fails
          if (site.instructions && site.instructions.trim()) {
            systemPrompt += `\n\n• ${site.url}\n  REQUIRED SEARCH CASES:\n  - ${site.instructions}`;
          } else {
            systemPrompt += `\n\n• ${site.url}\n  REQUIRED SEARCH CASES:\n  - When users ask about information from this website\n  - When current information is needed`;
          }
        }
      }
      
      systemPrompt += `\n\nIMPORTANT: You MUST search these websites when the query matches any of the specified cases. Do not rely on general knowledge - either use our knowledge base or search our approved websites.`;
    }
    
    // Add context about knowledge base access without mentioning uploads
    if (useFileSearch) {
      systemPrompt += `\n\nYou have access to a curated knowledge base to help answer questions accurately. You should ALWAYS search this knowledge base before responding to user questions. Use the file search capability to retrieve relevant information. 

KNOWLEDGE BASE INSTRUCTIONS:
1. When retrieving information from our knowledge base, ALWAYS convert it to first-person plural (we/us/our)
2. Never present knowledge as "the document says" or "according to the file" - speak as the business directly
3. Maintain our brand voice consistently regardless of how the information is stored
4. Important: Never mention "uploaded files" or suggest that the user has uploaded any documents. The knowledge base was prepared by administrators, not the current user.`;

      // Add special handling for catalog data
      systemPrompt += `\n\nCATALOG DATA INSTRUCTIONS:
1. Our product catalog contains manually entered product information including names, descriptions, pricing, and images
2. When working with product data from our catalog:
   - Present the information as if you are a salesperson knowledgeable about our offerings
   - Format prices, descriptions, and other details in a conversational, helpful way
   - ALWAYS use first-person plural - "We offer this product at $X" not "The product costs $X"
   - If a product has an image, you can share it by including the imageUrl in your response
3. For product images:
   - When a user first asks about a specific product or ask for pricing, proactively include the image URL in your response
   - Only share a product's image URL once per conversation unless specifically asked again
   - If a user asks to see the product or image again, include the URL in your response
   - Simply insert the full image URL in your response text and it will render as an image
   - Example: "We offer our Premium Widget for $99. Here's what it looks like: https://example.com/image.jpg"
   - If a product doesn't have an image, you can mention this: "We don't currently have an image for this product" or something simple and friendly.
4. For any product inquiry:
   - Search thoroughly through our product catalog before responding
   - Present product information clearly, accurately, and conversationally
   - Include product images where available by sharing the image URL
   - NEVER say you can't find information without searching the knowledge base first
   - If multiple products match, present options clearly to help the user choose`;
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
        console.log(`Using file search with vector store IDs:`, vectorStoreIds);
        tools.push({ 
          type: "file_search",
          vector_store_ids: vectorStoreIds,
          max_num_results: 20
        });
      }
      
      if (useWebSearch) {
        tools.push({ 
          type: "web_search_preview",
          ...webSearchOptions
        });
      }
      
      // Determine tool_choice based on available tools
      let toolChoice: 'auto' | 'required' | { type: string, function: { name: string } } = 'auto';
      
      // If we have file search tool and the query seems like it needs knowledge
      // force the model to use file_search first
      if (useFileSearch) {
        toolChoice = 'required';
        console.log('Forcing file search to be used');
      }
      
      // Use the Responses API which properly supports file_search and web_search_preview
      response = await openai.responses.create({
        model: modelName,
        instructions: fullPrompt,
        input: userInput,
        temperature: chatbot.temperature || 0.7,
        max_output_tokens: chatbot.maxCompletionTokens || 1000,
        stream: true,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? toolChoice : undefined
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
            
            // Log file search tool use if detected
            if (chunk.type === 'tool_call_created' && chunk.tool_call?.type === 'file_search') {
              console.log('File search tool being used!');
            } else if (chunk.type === 'file_search_call.created') {
              console.log('File search call created!');
            } else if (chunk.type === 'file_search_call.completed') {
              console.log('File search call completed!', chunk.file_search_call?.results?.length || 0, 'results found');
            } else if (chunk.type === 'response.partial') {
              console.log('Response partial:', chunk);
            }
            
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