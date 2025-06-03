import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { getThreadMessages } from '@/lib/chat-interface/adapters';
import { StreamingTextResponse } from '@/lib/chat-interface/ai/compatibility';
import prisma from '@/lib/prisma'; // Import shared instance
import { 
  handleCheckAvailability, 
  handleBookAppointment, 
  handleViewAppointment, 
  handleModifyAppointment, 
  handleCancelAppointment 
} from './handlers/calendar';
import { getCalendarTools, CalendarConfig } from './tools/calendar-tools';
import { buildSystemPrompt } from './utils/system-prompt';

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

    console.log(`[Chat Interface] Chatbot data:`, JSON.stringify({
      id: chatbot.id,
      name: chatbot.name,
      calendarEnabled: chatbot.calendarEnabled,
      calendarId: chatbot.calendarId
    }));

    // Get the model name from the chatbot's model relation
    let modelName = 'gpt-4.1-mini-2025-04-14'; // Default model
    if (chatbot.model && chatbot.model.name) {
      modelName = chatbot.model.name;
    }

    // Check if calendar action is enabled for this agent
    // Use the simpler calendarEnabled and calendarId fields from the chatbot
    let calendarActionEnabled = false;
    let calendarConfig: CalendarConfig | null = null;
    
    try {
      console.log(`[Calendar Action] Checking calendar for chatbot ${tempChatbotId}`);
      console.log(`[Calendar Action] Chatbot calendar enabled: ${chatbot.calendarEnabled}, calendarId: ${chatbot.calendarId}`);
      
      if (chatbot.calendarEnabled && chatbot.calendarId) {
        // Fetch the calendar directly from the database instead of making an HTTP request
        const calendar = await prisma.calendar.findUnique({
          where: {
            id: chatbot.calendarId
          }
        });
        
        console.log(`[Calendar Action] Calendar found:`, calendar ? 'Yes' : 'No');
        
        if (calendar) {
          console.log(`[Calendar Action] Calendar validated successfully:`, calendar.name);
          
          calendarActionEnabled = true;
          // Build calendar config from the calendar data
          calendarConfig = {
            defaultCalendarId: chatbot.calendarId,
            askForDuration: (calendar as any).askForDuration ?? true,
            askForNotes: (calendar as any).askForNotes ?? true,
            defaultDuration: (calendar as any).defaultDuration || 30,
            bufferBetweenAppointments: (calendar as any).bufferBetweenAppointments || 15,
            maxBookingsPerSlot: (calendar as any).maxBookingsPerSlot || 1,
            minimumAdvanceNotice: (calendar as any).minimumAdvanceNotice || 60,
            requirePhoneNumber: (calendar as any).requirePhoneNumber ?? true,
            defaultLocation: (calendar as any).defaultLocation || null,
            bookingPrompt: (calendar as any).bookingPrompt || 'I can help you schedule appointments on our calendar.',
            confirmationMessage: (calendar as any).confirmationMessage || 'I\'ve successfully scheduled your appointment! You will receive a confirmation email.',
          };
          
          console.log(`[Calendar Action] Calendar config built:`, calendarConfig);
          } else {
          console.log(`[Calendar Action] Calendar not found in database`);
        }
      } else {
        console.log(`[Calendar Action] Calendar not enabled or no calendar ID set`);
      }
    } catch (error) {
      console.error('[Calendar Action] Error checking calendar configuration:', error);
      // Continue without calendar action if there's an error
      calendarActionEnabled = false;
    }
    
    console.log(`[Calendar Action] Final state - Enabled: ${calendarActionEnabled}`);
    
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

    // Fetch user/company information
    let companyName = 'the company';
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: chatbot.userId
        },
        select: {
          companyName: true
        }
      });
      
      if (user?.companyName) {
        companyName = user.companyName;
      }
    } catch (error) {
      console.error('Error fetching user/company data:', error);
    }

    // Build system prompt using the utility function
    const systemPrompt = buildSystemPrompt({
      chatbotName: chatbot.name,
      companyName,
      basePrompt: chatbot.prompt || 'You are a helpful AI assistant.',
      calendarEnabled: calendarActionEnabled,
      calendarConfig,
      useFileSearch,
      useWebSearch,
      websiteInstructions,
      knowledge
    });

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
    
    // Add calendar booking tools if enabled
    if (calendarActionEnabled && calendarConfig) {
      console.log(`[Responses API] Using calendar_booking tool with calendar ID:`, calendarConfig.defaultCalendarId);
      toolsForResponsesApi.push(...getCalendarTools(calendarConfig));
    }
    
    if (useFileSearch && vectorStoreIds.length > 0) {
      console.log(`[Responses API] Using file_search with vector store IDs:`, vectorStoreIds);
      toolsForResponsesApi.push({ 
          type: "file_search",
          vector_store_ids: vectorStoreIds,
        });
      }
    // Restore web_search tool 
      if (useWebSearch) {
      console.log(`[Responses API] Using web_search with options:`, webSearchOptions);
      toolsForResponsesApi.push({ 
          type: "web_search",
          ...webSearchOptions // Spread options directly instead of nesting under web_search
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
      
    // Build conversation history for the Responses API
    let conversationInput = [];
    
    // If this is a continuing conversation, fetch previous messages from the database
    if (threadId) {
      try {
        // Get the timestamp of the oldest message in the current request to avoid duplicates
        const currentMessagesTimestamp = new Date();
        
        // Fetch previous messages from the database (excluding any that might be in the current request)
        const previousMessages = await prisma.message.findMany({
          where: {
            threadId: threadId,
            chatbotId: chatbotId,
            createdAt: {
              lt: currentMessagesTimestamp // Only get messages before this request
            }
          },
          orderBy: {
            createdAt: 'desc' // Get newest first
          },
          take: 20 // Get last 20 messages (10 exchanges)
        });
        
        // Reverse to get chronological order
        previousMessages.reverse();
        
        // Convert database messages to the format expected by Responses API
        for (const msg of previousMessages) {
          // Add user message
          conversationInput.push({
            type: "message",
            role: "user",
            content: [{
              type: "input_text",
              text: msg.message
            }]
          });
          
          // Add assistant response
          if (msg.response) {
            conversationInput.push({
              type: "message",
              role: "assistant",
              content: [{
                type: "output_text",
                text: msg.response
              }]
            });
          }
        }
        
        console.log(`[Responses API] Loaded ${previousMessages.length} previous messages for context`);
      } catch (error) {
        console.error('[Responses API] Error fetching conversation history:', error);
        // Continue without history if there's an error
      }
    }
    
    // Add the current user message
    conversationInput.push({
      type: "message",
      role: "user",
      content: [{
        type: "input_text",
        text: userInput
      }]
    });
    
    // Get the previous response ID if this is a continuing conversation
    let previousResponseId = null;
    if (threadId && messages.length > 1) {
      try {
        // Get the most recent assistant message from the database
        // We'll use the message ID as the response ID for assistant messages
        const lastAssistantMessage = await prisma.message.findFirst({
          where: {
            threadId: threadId,
            from: 'assistant',
            chatbotId: chatbotId
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true
          }
        });
        
        if (lastAssistantMessage?.id) {
          // The message ID contains the response ID for assistant messages
          previousResponseId = lastAssistantMessage.id;
          console.log(`[Responses API] Using previous_response_id: ${previousResponseId}`);
        }
      } catch (error) {
        console.error('[Responses API] Error fetching previous response ID:', error);
        // Continue without previous response ID
      }
    }
      
    // Construct the payload for the Responses API call
    const responsesPayload = {
        model: modelName,
        instructions: systemPrompt,
        input: conversationInput, // Use the full conversation history
        temperature: chatbot.temperature || 0.7,
        max_output_tokens: chatbot.maxCompletionTokens || 1000,
        stream: true,
        tools: toolsForResponsesApi.length > 0 ? toolsForResponsesApi : undefined,
        // Add previous_response_id for conversation continuity
        previous_response_id: previousResponseId
    };
    
    console.log(`[Chat Interface] Tools being sent:`, toolsForResponsesApi.length, 'tools');
    if (toolsForResponsesApi.length > 0) {
      console.log(`[Chat Interface] Tool types:`, toolsForResponsesApi.map(t => t.type || t.function?.name).join(', '));
      console.log(`[Chat Interface] Full tools array:`, JSON.stringify(toolsForResponsesApi, null, 2));
    }
    console.log(`[Chat Interface] Calendar action enabled:`, calendarActionEnabled);

    let responseStream;
    try {
      console.log("[Responses API] Calling openai.responses.create with full toolset");
      console.log("[Responses API] Payload:", JSON.stringify({
        model: responsesPayload.model,
        instructions: responsesPayload.instructions.substring(0, 200) + '...',
        input: responsesPayload.input.length + ' messages',
        temperature: responsesPayload.temperature,
        max_output_tokens: responsesPayload.max_output_tokens,
        stream: responsesPayload.stream,
        tools: responsesPayload.tools ? responsesPayload.tools.length + ' tools' : 'no tools',
        previous_response_id: responsesPayload.previous_response_id
      }, null, 2));
      
      responseStream = await openai.responses.create(responsesPayload as any); 
      
      // For non-streaming response (debugging)
      if (!responsesPayload.stream) {
        console.log("[Responses API] Non-streaming response received");
        const response = responseStream as any;
        console.log("[Responses API] Response:", JSON.stringify(response, null, 2));
        
        // Return the response as JSON for debugging
        return NextResponse.json({
          output: response.output,
          usage: response.usage,
          id: response.id
        });
      }

      // Create a proper text stream for the Vercel AI SDK in 'text' protocol mode
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let completion = '';
          let responseId = null; // Capture the response ID
          
          try {
            console.log("[Responses API] Starting stream processing");
            
            // Process each chunk from OpenAI
            for await (const chunk of responseStream) {
              // Log for debugging
              console.log('[Responses API Chunk]', JSON.stringify(chunk));
              
              // Log chunk type specifically
              if (chunk.type) {
                console.log('[Responses API] Chunk type:', chunk.type);
              }
              
              // Capture response ID from the first chunk
              if (!responseId && chunk.id) {
                responseId = chunk.id;
                console.log('[Responses API] Captured response ID:', responseId);
              }
              
              // Handle function calls based on actual chunk types from logs
              if (chunk.type === 'response.output_item.done' && chunk.item?.type === 'function_call') {
                console.log('[Responses API] Function call completed:', chunk.item.name);
                console.log('[Responses API] Function arguments:', chunk.item.arguments);
                const functionCall = chunk.item;
                
                if (functionCall.name === 'check_availability') {
                  try {
                    const args = JSON.parse(functionCall.arguments);
                    console.log('[Calendar Tool] Checking availability with args:', args);
                    
                    const result = await handleCheckAvailability(args, calendarConfig);
                    const resultData = JSON.parse(result);
                    
                    const resultMsg = resultData.message;
                    completion += resultMsg;
                    controller.enqueue(encoder.encode(resultMsg));
                  } catch (e) {
                    console.error('[Calendar Tool] Error:', e);
                    const errorMsg = "Sorry, I couldn't check the calendar availability.";
                    completion += errorMsg;
                    controller.enqueue(encoder.encode(errorMsg));
                  }
                }
                else if (functionCall.name === 'book_appointment') {
                    try {
                    const args = JSON.parse(functionCall.arguments);
                    console.log('[Calendar Tool] Booking appointment with args:', args);
                    
                      const result = await handleBookAppointment(args, calendarConfig, chatbot.userId);
                    const resultData = JSON.parse(result);
                    
                    const resultMsg = resultData.message;
                    completion += resultMsg;
                    controller.enqueue(encoder.encode(resultMsg));
                    } catch (e) {
                    console.error('[Calendar Tool] Error:', e);
                    const errorMsg = "Sorry, there was an error booking your appointment.";
                    completion += errorMsg;
                    controller.enqueue(encoder.encode(errorMsg));
                  }
                }
                else if (functionCall.name === 'view_appointment') {
                  try {
                    const args = JSON.parse(functionCall.arguments);
                    console.log('[Calendar Tool] Viewing appointment with args:', args);
                    
                    const result = await handleViewAppointment(args);
                    const resultData = JSON.parse(result);
                    
                    const resultMsg = resultData.message;
                    completion += resultMsg;
                    controller.enqueue(encoder.encode(resultMsg));
                  } catch (e) {
                    console.error('[Calendar Tool] Error:', e);
                    const errorMsg = "Sorry, I couldn't retrieve the appointment details.";
                    completion += errorMsg;
                    controller.enqueue(encoder.encode(errorMsg));
                  }
                }
                else if (functionCall.name === 'modify_appointment') {
                  try {
                    const args = JSON.parse(functionCall.arguments);
                    console.log('[Calendar Tool] Modifying appointment with args:', args);
                    
                    const result = await handleModifyAppointment(args, calendarConfig);
                    const resultData = JSON.parse(result);
                    
                    const resultMsg = resultData.message;
                    completion += resultMsg;
                    controller.enqueue(encoder.encode(resultMsg));
                  } catch (e) {
                    console.error('[Calendar Tool] Error:', e);
                    const errorMsg = "Sorry, I couldn't modify the appointment.";
                    completion += errorMsg;
                    controller.enqueue(encoder.encode(errorMsg));
                  }
                }
                else if (functionCall.name === 'cancel_appointment') {
                  try {
                    const args = JSON.parse(functionCall.arguments);
                    console.log('[Calendar Tool] Canceling appointment with args:', args);
                    
                    const result = await handleCancelAppointment(args);
                    const resultData = JSON.parse(result);
                    
                    const resultMsg = resultData.message;
                    completion += resultMsg;
                    controller.enqueue(encoder.encode(resultMsg));
                  } catch (e) {
                    console.error('[Calendar Tool] Error:', e);
                    const errorMsg = "Sorry, I couldn't cancel the appointment.";
                    completion += errorMsg;
                    controller.enqueue(encoder.encode(errorMsg));
                  }
                }
                continue;
              }
              
              // Handle the completed response
              if (chunk.type === 'response.completed' && chunk.response?.output) {
                console.log('[Responses API] Response completed with output');
                // Don't process function calls here as they're already handled in response.output_item.done
                continue;
              }
              
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
                // Use the response ID as the message ID if available
                const messageData: any = { 
                     message: userInput,
                     response: completion,
                     threadId: threadId,
                     from: 'user', // Using 'user' as in reference implementation
                     userId: userId,
                     chatbotId: chatbotId,
                     read: false,
                };
                
                // If we have a response ID, use it as the message ID for the assistant response
                if (responseId) {
                  messageData.id = responseId;
                  } 
                
                await prisma.message.create({ 
                  data: messageData
                });
                
                console.log(`[DB SAVE] Successfully saved message pair for thread ${threadId} with response ID: ${responseId}`);
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