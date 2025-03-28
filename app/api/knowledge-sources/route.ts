import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from 'next/server';

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

    // If it's an embedded request, we don't require authentication
    if (!isEmbedded && !session?.user && !userId) {
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
      where = {
        userId: userId || session?.user?.id
      };
    }

    // Log the query we're about to make for debugging
    console.log('Fetching knowledge sources with query:', JSON.stringify(where));

    // Get knowledge sources with their contents
    const knowledgeSources = await db.knowledgeSource.findMany({
      where,
      include: {
        textContents: true,
        websiteContents: true,
        qaContents: true,
        chatbots: true,
      }
    });

    console.log(`Found ${knowledgeSources.length} knowledge sources`);

    // For embedded requests, only return sources that are associated with public chatbots
    const filteredSources = isEmbedded 
      ? knowledgeSources.filter(source => 
          source.chatbots?.some(chatbot => chatbot.allowEveryone)
        )
      : knowledgeSources;

    return NextResponse.json(filteredSources);
  } catch (error) {
    console.error('Error fetching knowledge sources:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to fetch knowledge sources';
    let statusCode = 500;
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2021') {
        errorMessage = 'Database table does not exist. Please run prisma db push';
      } else {
        errorMessage = `Prisma error: ${error.code} - ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: statusCode }
    );
  }
}

// POST handler to create a new knowledge source
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    const json = await req.json();
    const body = createSourceSchema.parse(json);

    try {
      // @ts-ignore - The knowledgeSource model exists in the schema but TypeScript doesn't know about it yet
      const source = await db.knowledgeSource.create({
        data: {
          name: body.name,
          description: body.description,
          userId: session.user.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return new Response(JSON.stringify(source), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (dbError: unknown) {
      // Check if the error is because the table doesn't exist
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2021') {
        console.error("Database table does not exist:", dbError);
        return new Response("Database tables not created. Please run 'npx prisma db push'", { status: 500 });
      }
      throw dbError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Error creating knowledge source:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
} 