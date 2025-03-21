import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

export const maxDuration = 60;

export async function POST(req: Request) {
  console.log("File upload API called");
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error("Unauthorized: No session found");
      return new Response('Unauthorized', { status: 401 });
    }
    
    console.log(`User session:`, { userId: session.user?.id });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const chatbotId = formData.get('chatbotId') as string;
    const threadId = formData.get('threadId') as string;

    if (!file) {
      console.error("No file provided");
      return new Response('No file provided', { status: 400 });
    }

    if (!chatbotId) {
      console.error("No chatbot ID provided");
      return new Response('No chatbot ID provided', { status: 400 });
    }
    
    console.log(`Upload request:`, { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      chatbotId,
      hasThreadId: !!threadId
    });

    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: chatbotId,
      },
    });

    if (!chatbot) {
      console.error(`Chatbot not found: ${chatbotId}`);
      return new Response('Chatbot not found', { status: 404 });
    }
    
    console.log(`Found chatbot: ${chatbot.name}`);

    // Use the global OpenAI API key
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key is not configured");
      return new Response('OpenAI API key is not configured', { status: 500 });
    }

    // Create a new OpenAI client with the global API key
    const client = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Convert the file to a proper format for OpenAI
    console.log("Converting file to buffer");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a proper file object for OpenAI
    console.log("Uploading file to OpenAI");
    const openaiFile = await client.files.create({
      file: new File([buffer], file.name, { type: file.type }),
      purpose: 'assistants',
    });
    
    console.log(`File uploaded to OpenAI: ${openaiFile.id}`);

    // Create a new thread if one doesn't exist
    let threadIdToUse = threadId;
    if (!threadIdToUse) {
      console.log("Creating new thread");
      const thread = await client.beta.threads.create();
      threadIdToUse = thread.id;
      console.log(`Created new thread: ${threadIdToUse}`);
    }

    // Add the file to the thread
    console.log(`Adding file to thread: ${threadIdToUse}`);
    await client.beta.threads.messages.create(threadIdToUse, {
      role: 'user',
      content: '',
      file_ids: [openaiFile.id]
    });
    
    console.log("File added to thread successfully");

    // Store the file in the database
    try {
      console.log("Storing file in database");
      const dbFile = await prisma.file.create({
        data: {
          name: file.name,
          openAIFileId: openaiFile.id,
          userId: session.user.id,
          blobUrl: '', // You might want to store the file in your own storage
        },
      });
      
      // Associate the file with the chatbot
      await prisma.chatbotFiles.create({
        data: {
          chatbotId: chatbot.id,
          fileId: dbFile.id,
        },
      });
      
      console.log(`File stored in database: ${dbFile.id}`);
    } catch (error) {
      console.error("Error storing file in database:", error);
      // Continue even if database storage fails
    }

    return NextResponse.json({
      fileId: openaiFile.id,
      threadId: threadIdToUse,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}