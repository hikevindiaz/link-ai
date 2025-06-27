import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from 'next/server';
// No longer using OpenAI vector stores - using Supabase vectors

// Schema for creating a new knowledge source
const createSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

// GET handler to fetch all knowledge sources for the current user
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get('chatbotId');
    const userId = searchParams.get('userId');
    const isEmbedded = req.headers.get('referer')?.includes('/embed/');

    console.log('[KnowledgeSource] Request Info:', { 
      sessionUserId: session?.user?.id,
      queryUserId: userId,
      chatbotId,
      isEmbedded,
      url: req.url
    });

    // If it's an embedded request, we don't require authentication
    if (!isEmbedded && !session?.user && !userId) {
      console.log('[KnowledgeSource] Unauthorized: No session user or userId');
      return new Response("Unauthorized", { status: 403 });
    }

    // Define where clause based on parameters
    let where: any = {};
    
    // If chatbotId is provided, fetch sources for that chatbot
    if (chatbotId) {
      where = {
        chatbots: {
          some: {
            id: chatbotId,
            // Only check user ownership for non-embedded requests
            ...(isEmbedded ? {} : { userId: session?.user?.id || userId })
          }
        }
      };
    } 
    // Otherwise, fetch all sources for the provided userId or current user
    else {
      const effectiveUserId = userId || session?.user?.id;
      if (!effectiveUserId) {
        console.log('[KnowledgeSource] No effective userId found');
        return NextResponse.json(
          { error: 'No user ID provided or found in session' },
          { status: 400 }
        );
      }
      where = { userId: effectiveUserId };
    }

    // Log the query we're about to make for debugging
    console.log('[KnowledgeSource] Fetching with query:', JSON.stringify(where));

    try {
      // Get knowledge sources with their contents
      const knowledgeSources = await db.knowledgeSource.findMany({
        where,
        include: {
          textContents: true,
          websiteContents: true,
          qaContents: true,
          files: true,
          catalogContents: true,
          chatbots: true,
        }
      });

      console.log(`[KnowledgeSource] Found ${knowledgeSources.length} sources`);

      // For embedded requests, only return sources that are associated with public chatbots
      const filteredSources = isEmbedded 
        ? knowledgeSources.filter(source => 
            source.chatbots?.some(chatbot => chatbot.allowEveryone)
          )
        : knowledgeSources;

      return NextResponse.json(filteredSources);
    } catch (dbError) {
      console.error('[KnowledgeSource] Database error:', dbError);
      
      // Handle database errors specifically
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
        if (dbError.code === 'P2021') {
          return NextResponse.json(
            { error: 'Database table does not exist. Please run prisma db push' },
            { status: 500 }
          );
        }
      }
      
      throw dbError; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    console.error('[KnowledgeSource] Error fetching knowledge sources:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to fetch knowledge sources';
    let statusCode = 500;
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = `Prisma error ${error.code}: ${error.message}`;
      console.log('[KnowledgeSource] Prisma error details:', error);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.stack : undefined,
        message: 'See server logs for more details'
      },
      { status: statusCode }
    );
  }
}

// POST handler to create a new knowledge source
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse and validate the request body
    const json = await req.json();
    const body = createSourceSchema.parse(json);

    console.log('Creating knowledge source with data:', {
      name: body.name,
      description: body.description,
      userId: session.user.id
    });

    // Create the knowledge source
    const knowledgeSource = await db.knowledgeSource.create({
      data: {
        name: body.name,
        description: body.description,
        userId: session.user.id,
      },
    });

    console.log('Created knowledge source:', knowledgeSource);

    // Vector store is created automatically when content is added
    // No need to create OpenAI vector stores anymore

    return NextResponse.json(knowledgeSource);
  } catch (error) {
    console.error('Error creating knowledge source:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Validation error',
          details: error.errors 
        }),
        { status: 400 }
      );
    }

    // Handle database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2021') {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Database tables not created. Please run prisma db push' 
          }),
          { status: 500 }
        );
      }
    }

    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create knowledge source',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500 }
    );
  }
} 