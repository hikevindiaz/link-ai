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
    const { searchParams } = new URL(req.url);
    const chatbotId = searchParams.get('chatbotId');

    if (!chatbotId) {
      return NextResponse.json({ error: 'chatbotId is required' }, { status: 400 });
    }

    // Get knowledge sources with their contents
    const knowledgeSources = await db.knowledgeSource.findMany({
      where: {
        chatbots: {
          some: {
            id: chatbotId
          }
        }
      },
      include: {
        textContents: true,
        websiteContents: true,
        qaContents: true,
      }
    });

    return NextResponse.json(knowledgeSources);
  } catch (error) {
    console.error('Error fetching knowledge sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge sources' },
      { status: 500 }
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