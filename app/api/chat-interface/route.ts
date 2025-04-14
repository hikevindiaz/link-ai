import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { getThreadMessages } from '@/lib/chat-interface/adapters';
import { StreamingTextResponse } from '@/lib/chat-interface/ai/compatibility';
import prisma from '@/lib/prisma'; // Import shared instance

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    // Get chatbotId from request body temporarily for fetching chatbot details
    // We will properly destructure messages, userLocation, and threadId later
    const bodyForIdCheck = await req.json();
    const tempChatbotId = bodyForIdCheck.chatbotId;

    if (!tempChatbotId) {
      return new Response('Missing chatbotId', { status: 400 });
    }

    // Fetch chatbot details using REST API
    const chatbotResponse = await fetch(`${req.headers.get('origin')}/api/chatbots/${tempChatbotId}`, {
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
      `${req.headers.get('origin')}/api/knowledge-sources?chatbotId=${tempChatbotId}`,
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
      
      console.log(`Found ${vectorStoreIds.length} vector stores for chatbot ${tempChatbotId}:`, vectorStoreIds);
      
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

    // --- MOVE webSearchOptions DEFINITION EARLIER --- 
    // Configure web search options
    let webSearchOptions = {};
    if (useWebSearch) {
      webSearchOptions = {
        search_context_size: "medium" // Could be "low", "medium", or "high"
      };
      
      // Extract userLocation from the request body (need bodyForIdCheck here)
      const { userLocation } = bodyForIdCheck;
      
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
    // --- END MOVED BLOCK --- 

    // Define tools specifically for the Responses API (Restored)
    const toolsForResponsesApi = [];
    if (useFileSearch && vectorStoreIds.length > 0) {
      console.log(`[Responses API] Using file_search with vector store IDs:`, vectorStoreIds);
      toolsForResponsesApi.push({ 
          type: "file_search",
          vector_store_ids: vectorStoreIds,
        });
      }
    // Restore web_search_preview tool 
      if (useWebSearch) {
      console.log(`[Responses API] Using web_search_preview with options:`, webSearchOptions);
      toolsForResponsesApi.push({ 
          type: "web_search_preview",
        ...webSearchOptions // webSearchOptions is defined earlier
      });
    }
    
    // Extract messages, threadId correctly here
    const { messages, id: threadId } = bodyForIdCheck; 
    const userInput = messages?.filter((msg: any) => msg.role === 'user').pop()?.content || ""; 
    const userId = chatbot.userId;
    const chatbotId = tempChatbotId;

    // Ensure messages are present 
    if (!messages) {
       return new Response('Missing messages', { status: 400 });
    }
      
    // Construct the payload for the Responses API call
    const responsesPayload = {
        model: modelName,
        instructions: fullPrompt,
        input: userInput,
        temperature: chatbot.temperature || 0.7,
        max_output_tokens: chatbot.maxCompletionTokens || 1000,
        stream: true,
        tools: toolsForResponsesApi.length > 0 ? toolsForResponsesApi : undefined,
    };

    let responseStream;
    try {
      console.log("[Responses API] Calling openai.responses.create with full toolset");
      responseStream = await openai.responses.create(responsesPayload as any); 

      // Create a proper text stream for the Vercel AI SDK in 'text' protocol mode
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let completion = '';
          
          try {
            console.log("[Responses API] Starting stream processing");
            
            // Process each chunk from OpenAI
            for await (const chunk of responseStream) {
              // Log for debugging
              console.log('[Responses API Chunk]', JSON.stringify(chunk));
              
              // Extract text based on chunk type
              let chunkText = '';
              if (chunk.type === 'response.output_text.delta') {
                if (typeof chunk.delta === 'string') chunkText = chunk.delta;
                else if (chunk.delta?.text) chunkText = chunk.delta.text;
                else if (chunk.delta?.value) chunkText = chunk.delta.value;
              }
              else if (chunk.type === 'message_delta' && chunk.delta?.content?.[0]?.text) {
                chunkText = chunk.delta.content[0].text;
              } else if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                chunkText = chunk.delta.text;
              }
              
              // Only send non-empty text chunks
              if (chunkText) {
                completion += chunkText;
                
                // For streamProtocol: 'text' we just send the raw text directly
                controller.enqueue(encoder.encode(chunkText));
              }
            }
            
            // Signal end of stream (not needed for text protocol but doesn't hurt)
            controller.close();
            console.log("[Responses API] Stream processing finished successfully");
          } catch (error) {
            console.error("[Responses API] Error processing stream:", error);
            controller.error(error);
          } finally {
            // Save the completed message to the database
            console.log('[DB SAVE] Attempting to save message with completion length:', completion.length);
            
            if (userId && threadId && userInput && completion) {
              try {
                await prisma.message.create({ 
                  data: { 
                     message: userInput,
                     response: completion,
                     threadId: threadId,
                     from: 'user', // Using 'user' as in reference implementation
                     userId: userId,
                     chatbotId: chatbotId,
                     read: false,
                  } 
                });
                
                console.log(`[DB SAVE] Successfully saved message pair for thread ${threadId}`);
              } catch (dbError) {
                console.error(`[DB SAVE ERROR] Failed to save message for thread ${threadId}:`, dbError);
              }
            } else {
              console.warn(`[DB SAVE WARN] Missing data for saving message: userId=${!!userId}, threadId=${!!threadId}, userInput=${!!userInput}, completion=${!!completion}`);
            }
          }
        }
      });
      
      // Return with the appropriate headers
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8', // Plain text for text protocol
          'Cache-Control': 'no-cache, no-transform',
          'X-Content-Type-Options': 'nosniff'
        },
      });

    } catch (error) {
      console.error('[Responses API] Error in OpenAI API call:', error);
      throw error;
    }

  } catch (error: any) {
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