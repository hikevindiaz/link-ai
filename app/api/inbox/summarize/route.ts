import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';
import crypto from 'crypto';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  // Ensure the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { threadId, messages, welcomeMessage, title, checkOnly } = body;
    
    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    }
    
    console.log(`Processing summary request for thread ${threadId}, checkOnly: ${checkOnly}`);
    
    // Check if a summary already exists for this thread
    try {
      console.log(`Looking for existing summary for thread ${threadId} in database`);
      // Use the model name exactly as it appears in the Prisma schema
      const existingSummary = await prisma.$queryRaw`
        SELECT * FROM "conversationSummary" 
        WHERE "threadId" = ${threadId}
      `;
      
      // Convert the result to a more usable format
      const summary = Array.isArray(existingSummary) && existingSummary.length > 0 
        ? existingSummary[0] 
        : null;
      
      if (summary) {
        console.log(`Found existing summary for thread ${threadId}: ${summary.id}`);
        
        // Validate the summary content
        const isValidSummary = 
          summary.title && 
          summary.summary && 
          summary.title.trim() !== "" && 
          summary.summary.trim() !== "" &&
          summary.title !== "Untitled Conversation";
        
        if (isValidSummary) {
          console.log(`Existing summary is valid, returning it`);
          // If we're just checking, or if we have a valid summary, return it
          return NextResponse.json({
            title: summary.title,
            summary: summary.summary,
            exists: true,
          });
        } else {
          console.log(`Existing summary for thread ${threadId} is invalid, will regenerate if not checkOnly`);
          // If we're just checking, return that no valid summary exists
          if (checkOnly) {
            return NextResponse.json({ exists: false }, { status: 404 });
          }
          // Otherwise continue to generate a new summary
        }
      } else {
        console.log(`No existing summary found for thread ${threadId}`);
        // If we're just checking, return that no summary exists
        if (checkOnly) {
          return NextResponse.json({ exists: false }, { status: 404 });
        }
        // Otherwise continue to generate a new summary
      }
    } catch (error) {
      console.error(`Error checking for existing summary: ${error}`);
      // If we're just checking, return that no summary exists
      if (checkOnly) {
        return NextResponse.json({ exists: false }, { status: 404 });
      }
      // Otherwise continue to generate a new summary
    }
    
    // If we're just checking and got here, it means no valid summary exists
    if (checkOnly) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }
    
    // If we get here, we need to generate a new summary
    
    // Format messages for OpenAI
    let formattedMessages = [];
    
    // Add system message with instructions
    formattedMessages.push({
      role: 'system',
      content: `You are a helpful assistant that summarizes conversations. Please provide a CONCISE summary of the following conversation, highlighting only the most important key points, decisions, and action items. Be brief and to the point.

Your response MUST be under 500 tokens total and formatted exactly as follows:

Title: [Brief, Descriptive Title of the Conversation - max 10 words]

Summary: [Concise summary focusing only on essential information - max 400 tokens]

If there's not enough content to summarize, please indicate that in your response.`
    });
    
    // Add welcome message if provided
    if (welcomeMessage) {
      formattedMessages.push({
        role: 'assistant',
        content: welcomeMessage
      });
    }
    
    // Add conversation messages
    if (Array.isArray(messages) && messages.length > 0) {
      // Filter out any messages without both role and content
      const validMessages = messages.filter(msg => 
        msg && typeof msg === 'object' && 
        'role' in msg && 'content' in msg &&
        msg.role && msg.content
      );
      
      if (validMessages.length > 0) {
        formattedMessages = [...formattedMessages, ...validMessages];
      } else {
        console.log('No valid messages found in the provided array');
      }
    } else {
      console.log('No messages provided, using title as context');
      // If no messages are provided, use the title as context
      formattedMessages.push({
        role: 'user',
        content: `I need a summary of a conversation titled "${title || 'Untitled Conversation'}".`
      });
    }
    
    console.log(`Sending ${formattedMessages.length} messages to OpenAI for summary generation`);
    
    // Call OpenAI to generate a summary
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 500,
      });
      
      console.log('OpenAI response received');
      
      // Extract the title and summary from the response
      const content = response.choices[0]?.message?.content || '';
      
      // Use regex to extract the title and summary
      const titleMatch = content.match(/Title:\s*(.*?)(?:\n|$)/);
      const summaryMatch = content.match(/Summary:\s*([\s\S]*?)(?:\n\n|$)/);
      
      const extractedTitle = titleMatch ? titleMatch[1].trim() : 'Untitled Conversation';
      const extractedSummary = summaryMatch ? summaryMatch[1].trim() : content.trim();
      
      // Validate the extracted content
      const isValidSummary = 
        extractedTitle && 
        extractedSummary && 
        extractedTitle.trim() !== "" && 
        extractedSummary.trim() !== "" &&
        extractedTitle !== "Untitled Conversation" &&
        !extractedSummary.includes("not enough content to summarize");
      
      if (!isValidSummary) {
        console.log('Generated summary is invalid or indicates insufficient content');
        return NextResponse.json({ 
          error: "Insufficient content to generate a meaningful summary",
          title: extractedTitle,
          summary: extractedSummary,
          valid: false
        }, { status: 400 });
      }
      
      // Try to save the summary to the database
      let dbSaveError = false;
      try {
        console.log(`Attempting to save summary to database for thread ${threadId}`);
        // Check if a summary already exists using raw SQL
        const existingSummary = await prisma.$queryRaw`
          SELECT * FROM "conversationSummary" 
          WHERE "threadId" = ${threadId}
        `;
        
        const summary = Array.isArray(existingSummary) && existingSummary.length > 0 
          ? existingSummary[0] 
          : null;
        
        if (summary) {
          console.log(`Updating existing summary ${summary.id} for thread ${threadId}`);
          // Update the existing summary using raw SQL
          await prisma.$executeRaw`
            UPDATE "conversationSummary"
            SET "title" = ${extractedTitle}, "summary" = ${extractedSummary}
            WHERE "id" = ${summary.id}
          `;
          console.log(`Successfully updated summary ${summary.id}`);
        } else {
          console.log(`Creating new summary for thread ${threadId}`);
          // Create a new summary using raw SQL
          const id = crypto.randomUUID();
          await prisma.$executeRaw`
            INSERT INTO "conversationSummary" ("id", "threadId", "title", "summary", "created_at", "userId")
            VALUES (${id}, ${threadId}, ${extractedTitle}, ${extractedSummary}, CURRENT_TIMESTAMP, ${session.user.id})
          `;
          console.log(`Successfully created new summary with ID ${id}`);
        }
      } catch (error) {
        console.error(`Error saving summary to database: ${error}`);
        dbSaveError = true;
      }
      
      // Return the summary
      return NextResponse.json({
        title: extractedTitle,
        summary: extractedSummary,
        dbSaveError,
      });
    } catch (error) {
      console.error(`Error calling OpenAI API: ${error}`);
      return NextResponse.json({ 
        error: "Failed to generate summary with OpenAI",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`Error in summary API: ${error}`);
    return NextResponse.json({ 
      error: "Failed to process summary request",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 