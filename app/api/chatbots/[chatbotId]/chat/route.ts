import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import OpenAI from "openai";
import { StreamingTextResponse } from "ai";

export const maxDuration = 300;

// Define schemas for request validation
const validateRequest = (body: any) => {
  if (!body.message?.content) {
    return { valid: false, error: "Message content is required" };
  }
  return { valid: true };
};

// Custom stream implementation to ensure proper format
function createStream(text: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send the text as a single chunk
      controller.enqueue(encoder.encode(`data: ${text}\n\n`));
      controller.close();
    },
  });
  return stream;
}

export async function POST(
  req: Request,
  { params }: { params: { chatbotId: string } }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      if (req.headers.get("content-type")?.includes("multipart/form-data")) {
        const formData = await req.formData();
        const messageContent = formData.get("message") as string;
        const threadId = formData.get("threadId") as string | null;
        
        body = {
          message: { content: messageContent, role: "user" },
          threadId: threadId || undefined,
        };
      } else {
        body = await req.json();
      }
      
      // Validate request body
      const validation = validateRequest(body);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Get the chatbot
    const chatbot = await db.chatbot.findUnique({
      where: {
        id: params.chatbotId,
        userId: session.user.id,
      },
      include: {
        model: true,
        knowledgeSources: {
          include: {
            textContents: true,
            qaContents: true,
          },
        },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    console.log("Chatbot data:", {
      id: chatbot.id,
      name: chatbot.name,
      openaiId: chatbot.openaiId,
      modelName: chatbot.model?.name,
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a thread if it doesn't exist
    let threadId = body.threadId;
    
    if (!threadId) {
      // Create a new thread ID (we'll just use a random string)
      threadId = `thread_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`Created new thread with ID: ${threadId}`);
    } else {
      console.log(`Using existing thread with ID: ${threadId}`);
    }

    // Prepare the system message with the chatbot's prompt and knowledge
    let systemMessage = chatbot.prompt || "You are a helpful assistant.";
    
    // Add knowledge from knowledge sources if available
    if (chatbot.knowledgeSources && chatbot.knowledgeSources.length > 0) {
      systemMessage += "\n\nHere is some additional knowledge you can use to answer questions:\n\n";
      
      // Add text content
      for (const ks of chatbot.knowledgeSources) {
        if (ks.textContents && ks.textContents.length > 0) {
          for (const tc of ks.textContents) {
            systemMessage += `${tc.content}\n\n`;
          }
        }
        
        // Add Q&A content
        if (ks.qaContents && ks.qaContents.length > 0) {
          for (const qa of ks.qaContents) {
            systemMessage += `Question: ${qa.question}\nAnswer: ${qa.answer}\n\n`;
          }
        }
      }
    }

    // Get previous messages if thread exists
    const previousMessages: Array<{ role: string; content: string }> = [];
    if (body.threadId) {
      try {
        // In a real implementation, you would fetch previous messages from your database
        // For now, we'll just use an empty array
      } catch (error) {
        console.error("Error fetching previous messages:", error);
      }
    }

    // Prepare the messages for the chat completion
    const messages = [
      { role: "system", content: systemMessage },
      ...previousMessages,
      { role: "user", content: body.message.content }
    ];

    // Call the OpenAI API without streaming
    const completion = await openai.chat.completions.create({
      model: chatbot.model?.name || "gpt-4o",
      messages: messages as any, // Type assertion to fix type error
      temperature: chatbot.temperature ?? 0.7, // Use nullish coalescing to fix property error
    });

    // Extract the assistant's response
    const assistantResponse = completion.choices[0].message.content;
    
    // Create a stream with the assistant's response
    const stream = createStream(assistantResponse);
    
    // Return a streaming response
    return new StreamingTextResponse(stream, {
      headers: {
        'X-Thread-ID': threadId,
      },
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    
    // Return a proper error response
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
