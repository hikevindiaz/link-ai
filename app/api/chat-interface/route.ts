import { OpenAIStream, StreamingTextResponse } from 'ai';
import { OpenAI } from 'openai';
import { getThreadMessages, storeUserMessage, storeAssistantMessage } from '@/lib/chat-interface/adapters';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Message } from 'ai';

// Define interfaces for our chatbot model
interface ChatbotWithAssistant {
  id?: string;
  prompt?: string;
  temperature?: number;
  maxCompletionTokens?: number;
  modelId?: string;
  name?: string;
  openaiAssistantId?: string | undefined;
  openaiThreadId?: string | undefined;
}

// Initialize Prisma client
const prisma = new PrismaClient();

// Create an OpenAI API client (ensuring we use the API key from environment variables)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Validate that we have an API key
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in the environment variables');
}

async function getChatbotKnowledge(chatbotId: string) {
  try {
    // First, get the chatbot to make sure it exists
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId }
    });

    if (!chatbot) {
      return '';
    }

    // Process and combine all knowledge sources
    let combinedKnowledge = '';

    // Get knowledge sources associated with this chatbot
    const knowledgeSources = await prisma.knowledgeSource.findMany({
      where: {
        chatbots: {
          some: {
            id: chatbotId
          }
        }
      }
    });

    // Process each knowledge source
    for (const source of knowledgeSources) {
      // Process text content
      const textContents = await prisma.textContent.findMany({
        where: { knowledgeSourceId: source.id }
      });

      for (const text of textContents) {
        combinedKnowledge += `\nText content from ${source.name}: ${text.content}\n`;
      }

      // Process website content
      const websiteContents = await prisma.websiteContent.findMany({
        where: { knowledgeSourceId: source.id }
      });

      for (const website of websiteContents) {
        combinedKnowledge += `\nWebsite content from ${website.url}\n`;
      }

      // Process Q&A content
      const qaContents = await prisma.qAContent.findMany({
        where: { knowledgeSourceId: source.id }
      });

      for (const qa of qaContents) {
        combinedKnowledge += `\nQ: ${qa.question}\nA: ${qa.answer}\n`;
      }

      // Process catalog content
      const catalogContents = await prisma.catalogContent.findMany({
        where: { knowledgeSourceId: source.id }
      });

      for (const catalog of catalogContents) {
        combinedKnowledge += `\nCatalog: ${catalog.id}\n`;

        // Get products for this catalog
        const products = await prisma.product.findMany({
          where: { catalogContentId: catalog.id }
        });

        for (const product of products) {
          combinedKnowledge += `\nProduct: ${product.title}, Description: ${product.description || ''}, Price: ${product.price}\n`;
        }
      }
    }

    return combinedKnowledge;
  } catch (error) {
    console.error('Error retrieving chatbot knowledge:', error);
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, id, chatbotId, selectedChatModel, testKnowledge } = await req.json();
    
    // Ensure we have required fields
    if (!messages || !chatbotId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Use the provided thread ID or generate a new one with a consistent format
    // This is CRITICAL for inbox integration - thread IDs must be consistent
    const threadId = id || `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Get the chatbot/agent details to use its settings
    let chatbot: ChatbotWithAssistant | null = null;
    let openaiAssistantId: string | null = null;
    let openaiThreadId: string | null = null;
    
    try {
      // Get the base chatbot
      const dbChatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
      });

      // Check for OpenAI assistant settings
      const assistantSettings = await prisma.$queryRaw`
        SELECT * FROM "AssistantSettings" 
        WHERE "chatbotId" = ${chatbotId} 
        LIMIT 1
      `;

      // Extract OpenAI assistant settings if they exist
      if (Array.isArray(assistantSettings) && assistantSettings.length > 0) {
        openaiAssistantId = assistantSettings[0].openaiAssistantId || null;
        openaiThreadId = assistantSettings[0].openaiThreadId || null;
      }
      
      // If this is an agent ID from the test page, it might not exist yet
      if (!dbChatbot && chatbotId.startsWith('test-')) {
        // Use default settings for test agents
        chatbot = {
          id: chatbotId,
          prompt: 'You are a helpful assistant.',
          temperature: 0.7,
          maxCompletionTokens: 1200,
          modelId: selectedChatModel || 'gpt-3.5-turbo',
          name: 'Test Agent',
        };
      } else if (dbChatbot) {
        // Map the database chatbot to our expected format
        chatbot = {
          id: dbChatbot.id,
          prompt: dbChatbot.prompt || 'You are a helpful assistant.',
          temperature: dbChatbot.temperature || 0.7,
          maxCompletionTokens: dbChatbot.maxCompletionTokens || 1200,
          modelId: selectedChatModel || dbChatbot.modelId || 'gpt-3.5-turbo',
          name: dbChatbot.name,
          openaiAssistantId: openaiAssistantId || undefined,
          openaiThreadId: openaiThreadId || undefined
        };
      }
    } catch (error) {
      console.error('Error fetching chatbot:', error);
      // If we can't find the chatbot, use default settings
      chatbot = {
        prompt: 'You are a helpful assistant.',
        temperature: 0.7,
        maxCompletionTokens: 1200,
        modelId: selectedChatModel || 'gpt-3.5-turbo',
      };
    }
    
    // Store the user's message
    const userIp = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
    
    // Get the origin of the request (where the chat was started)
    const origin = req.headers.get('referer') || 
                   req.headers.get('origin') || 
                   'unknown';
    
    // Use the full origin URL instead of just extracting the hostname
    let from = origin;
    
    const latestMessage = messages[messages.length - 1];
    
    // Only store if it's a user message (not system or previous assistant messages)
    if (latestMessage.role === 'user') {
      try {
        const storedUserMessage = await storeUserMessage({
          threadId,
          content: latestMessage.content,
          chatbotId,
          userIP: userIp.toString(),
          from
        });
        console.log(`User message stored with ID: ${storedUserMessage.id} in thread: ${threadId}`);
      } catch (error) {
        console.error('Error storing user message:', error);
        // Continue even if storage fails
      }
    }
    
    // Ensure we're using OpenAI's Assistant API if we have an assistant ID
    if (openaiAssistantId && !testKnowledge) {
      return handleWithAssistantsAPI(
        threadId, 
        chatbot, 
        openaiAssistantId, 
        openaiThreadId, 
        latestMessage, 
        chatbotId,
        userIp.toString(),
        from
      );
    } else {
      // Use standard Chat Completions API
      if (chatbot) {
        return handleWithChatCompletions(
          messages, 
          chatbot, 
          threadId, 
          testKnowledge,
          userIp.toString(),
          from
        );
      } else {
        return NextResponse.json({ error: 'Failed to initialize chatbot' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle chat with OpenAI's Assistants API
async function handleWithAssistantsAPI(
  threadId: string,
  chatbot: ChatbotWithAssistant | null,
  assistantId: string,
  existingThreadId: string | null,
  latestMessage: any,
  chatbotId: string,
  userIP: string = 'unknown',
  from: string = 'unknown'
) {
  if (!chatbot) {
    return NextResponse.json({ error: 'Missing chatbot configuration' }, { status: 500 });
  }
  
  try {
    // Use Assistants API with existing assistant
    console.log(`Using existing Assistant ID: ${assistantId} for thread ${threadId}`);
    
    // Get or create OpenAI thread
    let openaiThreadId: string | undefined = existingThreadId || undefined;
    
    if (!openaiThreadId) {
      // Create a new thread
      const thread = await openai.beta.threads.create();
      openaiThreadId = thread.id;
      
      // Store the thread ID for future use if this is a persistent chatbot
      if (chatbot?.id && !chatbot.id.startsWith('test-')) {
        try {
          await prisma.$executeRaw`
            UPDATE "AssistantSettings" 
            SET "openaiThreadId" = ${thread.id} 
            WHERE "chatbotId" = ${chatbot.id}
          `;
        } catch (error) {
          console.error('Error updating thread ID:', error);
        }
      }
    }
    
    // Add the user message to the thread
    await openai.beta.threads.messages.create(
      openaiThreadId,
      { role: 'user', content: latestMessage.content }
    );
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(
      openaiThreadId,
      { assistant_id: assistantId }
    );
    
    // Create a streaming response
    const streamResponse = new ReadableStream({
      async start(controller) {
        let isComplete = false;
        let response = '';
        
        while (!isComplete) {
          // Check the run status
          if (!openaiThreadId) {
            const errorMessage = 'Missing OpenAI thread ID';
            controller.enqueue(new TextEncoder().encode(errorMessage));
            isComplete = true;
            controller.close();
            continue;
          }

          const runStatus = await openai.beta.threads.runs.retrieve(
            openaiThreadId,
            run.id
          );
          
          if (runStatus.status === 'completed') {
            // Get the assistant's messages
            const messages = await openai.beta.threads.messages.list(
              openaiThreadId
            );
            
            // Find the assistant's response message (should be the most recent)
            const assistantMessage = messages.data
              .filter(message => message.role === 'assistant')
              .sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
            
            if (assistantMessage) {
              // Get the text content from the message
              const textContent = assistantMessage.content
                .filter(content => content.type === 'text')
                .map(content => (content.type === 'text' ? content.text.value : ''))
                .join('\n');
              
              response = textContent;
              
              // Stream the final chunk
              controller.enqueue(new TextEncoder().encode(response));
              
              // Store the assistant's response in our database
              try {
                const storedAssistantMessage = await storeAssistantMessage({
                  threadId,
                  content: response,
                  chatbotId,
                  userIP,
                  from
                });
                console.log(`Assistant message stored with ID: ${storedAssistantMessage.id} in thread: ${threadId}`);
              } catch (error) {
                console.error('Error storing assistant message:', error);
              }
            }
            
            isComplete = true;
            controller.close();
          } else if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
            const errorMessage = 'Assistant failed to generate a response.';
            controller.enqueue(new TextEncoder().encode(errorMessage));
            isComplete = true;
            controller.close();
          } else {
            // Wait before polling again
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    });
    
    return new StreamingTextResponse(streamResponse);
  } catch (error) {
    console.error('Error using Assistants API:', error);
    // Fall back to Chat Completions API if we have a valid chatbot
    if (chatbot) {
      return handleWithChatCompletions([latestMessage], chatbot, threadId, undefined, userIP, from);
    } else {
      return NextResponse.json({ error: 'Failed to generate response with Assistant API' }, { status: 500 });
    }
  }
}

// Helper function to handle chat with the Chat Completions API
async function handleWithChatCompletions(
  messages: Message[], 
  chatbot: ChatbotWithAssistant, 
  threadId: string, 
  testKnowledge?: string,
  userIP: string = 'unknown',
  from: string = 'unknown'
) {
  try {
    console.log(`Processing chat with Thread ID: ${threadId}`);
    
    // Get chatbot knowledge if this is a real chatbot (not a test one)
    let knowledge = '';
    if (chatbot && chatbot.id && !chatbot.id.startsWith('test-')) {
      knowledge = await getChatbotKnowledge(chatbot.id);
    }
    
    // Prepare the system prompt
    let systemPrompt = chatbot?.prompt || 'You are a helpful assistant.';
    
    // Use test knowledge if provided (for testing purposes)
    if (testKnowledge) {
      systemPrompt += `\n\nHere is information about the system that you should use to answer questions:\n${testKnowledge}\n\nWhen you don't know the answer based on this information, please say 'I don't have that information' rather than making up an answer.`;
    }
    // Otherwise use real knowledge if available
    else if (knowledge) {
      systemPrompt += `\n\nHere is relevant knowledge you should use to answer questions:\n${knowledge}\n\nWhen you don't know the answer based on this knowledge, please say 'I don't have that information' rather than making up an answer.`;
    }
    
    // Prepare the messages for OpenAI, including the system prompt from the chatbot
    // Convert messages to the format expected by OpenAI API
    const apiMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...messages.map(msg => ({
        role: msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' ? msg.role : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      }))
    ];
    
    // Validate model - ensure it's a valid OpenAI model and not a chatbot ID
    // List of valid OpenAI models (update as needed)
    const validOpenAIModels = [
      'gpt-3.5-turbo', 
      'gpt-4', 
      'gpt-4-turbo',
      'gpt-4-vision-preview', 
      'gpt-4-1106-preview',
      'gpt-4-0613',
      'gpt-4-32k',
      'gpt-4-32k-0613',
      'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-instruct'
    ];
    
    // Get the specified model or use a default
    let model = chatbot?.modelId || 'gpt-3.5-turbo';
    
    // If the model doesn't look like a valid OpenAI model, use a default
    if (!validOpenAIModels.includes(model) && !model.startsWith('gpt-')) {
      console.warn(`Invalid model detected: "${model}". Falling back to gpt-3.5-turbo.`);
      model = 'gpt-3.5-turbo';
    }
    
    console.log(`Using Chat Completions API for thread ${threadId} with model ${model}`);
    
    // Generate a completion using the model specified by the chatbot
    const response = await openai.chat.completions.create({
      model,
      messages: apiMessages as any, // Type assertion to bypass TypeScript error
      temperature: chatbot?.temperature || 0.7,
      max_tokens: chatbot?.maxCompletionTokens || 1200,
      stream: true,
    });
    
    // Create a streaming response
    const stream = OpenAIStream(response, {
      onCompletion: async (completion) => {
        // Store the assistant's response
        try {
          const storedAssistantMessage = await storeAssistantMessage({
            threadId,
            content: completion,
            chatbotId: chatbot.id || threadId, // Fallback to threadId if no chatbot ID
            userIP,
            from
          });
          console.log(`Assistant message stored with ID: ${storedAssistantMessage.id} in thread: ${threadId}`);
        } catch (error) {
          console.error('Error storing assistant message:', error);
          // Continue even if storage fails
        }
      },
    });
    
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in chat completions API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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