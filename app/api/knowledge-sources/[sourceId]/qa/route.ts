import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from 'next/server';

const routeContextSchema = z.object({
  params: z.object({
    sourceId: z.string(),
  }),
});

// Schema for QA content validation
const qaContentSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

const qaContentArraySchema = z.array(qaContentSchema);

// Verify user has access to the knowledge source
async function verifyUserHasAccessToSource(sourceId: string, userId: string) {
  try {
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        userId: userId,
      },
    });

    return !!knowledgeSource;
  } catch (error: unknown) {
    console.error("Error verifying access:", error);
    return false;
  }
}

// GET handler to fetch QA content for a knowledge source
export async function GET(
  req: Request,
  { params }: { params: { sourceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const isEmbedded = req.headers.get('referer')?.includes('/embed/');
    const sourceId = params.sourceId;

    // If it's an embedded request, check if the source is associated with a public chatbot
    if (isEmbedded) {
      const source = await db.knowledgeSource.findUnique({
        where: { id: sourceId },
        include: {
          chatbots: true
        }
      });

      if (!source || !source.chatbots?.some(chatbot => chatbot.allowEveryone)) {
        return new Response("Forbidden", { status: 403 });
      }
    } else if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Get QA contents for the source
    const qaContents = await db.qAContent.findMany({
      where: {
        knowledgeSourceId: sourceId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(qaContents);
  } catch (error) {
    console.error('Error fetching QA contents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QA contents' },
      { status: 500 }
    );
  }
}

// POST handler to create new QA content
export async function POST(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Validate route params
    const { params } = routeContextSchema.parse(context);
    const { sourceId } = params;

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Parse request body
    const json = await req.json();
    const body = qaContentArraySchema.parse(json);

    // Create QA content entries
    const results = await Promise.all(
      body.map(async (qa) => {
        try {
          const qaContent = await db.qAContent.create({
            data: {
              question: qa.question,
              answer: qa.answer,
              knowledgeSource: {
                connect: {
                  id: sourceId,
                },
              },
            },
          });
          return { success: true, id: qaContent.id, question: qa.question };
        } catch (error) {
          console.error(`Error saving QA pair:`, error);
          return { success: false, question: qa.question, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return new Response(JSON.stringify({
      message: `${successCount} QA pair${successCount !== 1 ? 's' : ''} saved successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results
    }), {
      status: failureCount === results.length ? 400 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Error creating QA content:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// PUT handler to update QA content
export async function PUT(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Validate route params
    const { params } = routeContextSchema.parse(context);
    const { sourceId } = params;

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Parse request body
    const json = await req.json();
    const { id, ...data } = await z.object({
      id: z.string(),
      question: z.string().min(1, "Question is required"),
      answer: z.string().min(1, "Answer is required"),
    }).parse(json);

    // Update QA content
    const qaContent = await db.qAContent.update({
      where: {
        id: id,
        knowledgeSourceId: sourceId,
      },
      data: {
        question: data.question,
        answer: data.answer,
      },
    });

    return new Response(JSON.stringify(qaContent), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Error updating QA content:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// DELETE handler to delete QA content
export async function DELETE(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Validate route params
    const { params } = routeContextSchema.parse(context);
    const { sourceId } = params;

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Get content ID from the URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const contentId = pathParts[pathParts.length - 1];

    if (!contentId) {
      return new Response(JSON.stringify({ error: "Content ID is required for deletion" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Attempting to delete QA content: ${contentId} from source: ${sourceId}`);

    // Delete QA content
    await db.qAContent.delete({
      where: {
        id: contentId,
        knowledgeSourceId: sourceId,
      },
    });

    console.log(`Successfully deleted QA content: ${contentId}`);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error in DELETE handler:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to delete content" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 