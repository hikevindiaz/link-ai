import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { processContentV2, deleteContent, formatContent } from "@/lib/vector-service";

const routeContextSchema = z.object({
  params: z.object({
    sourceId: z.string(),
  }),
});

// Schema for text content creation/update
const textContentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  id: z.string().optional(), // Optional for updates
});

// Verify user has access to the knowledge source
async function verifyUserHasAccessToSource(sourceId: string, userId: string) {
  try {
    const count = await db.knowledgeSource.count({
      where: {
        id: sourceId,
        userId: userId,
      },
    });

    return count > 0;
  } catch (error: unknown) {
    // If the table doesn't exist, no one has access
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return false;
    }
    throw error;
  }
}

// GET handler to fetch text content for a knowledge source
export async function GET(
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

    // Fetch only text content from the TextContent table
    const textContent = await db.textContent.findMany({
      where: {
        knowledgeSourceId: sourceId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return new Response(JSON.stringify(textContent), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching text content:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// POST handler to create new text content
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
    const body = textContentSchema.parse(json);

    // Create text content
    const textContent = await db.textContent.create({
      data: {
        content: body.content,
        knowledgeSource: {
          connect: {
            id: sourceId,
          },
        },
      },
    });

    // Process to vector store
    try {
      console.log(`Processing text content ${textContent.id} to vector store for knowledge source ${sourceId}`);
      const { content, metadata } = formatContent('text', textContent);
      const jobId = await processContentV2(
        sourceId,
        textContent.id,
        'text',
        { content, metadata }
      );
      
      if (jobId) {
        console.log(`Successfully queued text content for vector processing with job ID: ${jobId}`);
      } else {
        console.log(`Text content already has vectors, no new job created`);
      }
    } catch (vectorStoreError) {
      console.error(`Error adding text to vector store:`, vectorStoreError);
      // Continue even if vector store processing fails
    }

    return new Response(JSON.stringify(textContent), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Error creating text content:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// PUT handler to update existing text content
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
    const body = textContentSchema.parse(json);

    if (!body.id) {
      return new Response(JSON.stringify({ error: "Content ID is required for updates" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update text content
    const textContent = await db.textContent.update({
      where: {
        id: body.id,
        knowledgeSourceId: sourceId,
      },
      data: {
        content: body.content,
      },
    });

    // Process updated content to vector store - using adapter for LLM-agnostic approach
    try {
      console.log(`Processing updated text content ${textContent.id} to vector store for knowledge source ${sourceId}`);
      
      // STEP 1: Delete existing vector documents to force re-processing
      console.log(`Deleting existing vectors for text content ${textContent.id} before update`);
      await deleteContent(sourceId, 'text', textContent.id);
      
      // STEP 2: Process updated content
      const { content, metadata } = formatContent('text', textContent);
      const jobId = await processContentV2(
        sourceId,
        textContent.id,
        'text',
        { content, metadata }
      );
      
      if (jobId) {
        console.log(`Successfully queued updated text content for vector processing with job ID: ${jobId}`);
      } else {
        console.log(`Updated text content already has current vectors, no new job created`);
      }
    } catch (vectorStoreError) {
      console.error(`Error processing updated text to vector store:`, vectorStoreError);
      // Continue even if vector store processing fails
    }

    return new Response(JSON.stringify(textContent), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Error updating text content:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// DELETE handler to delete text content
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

    console.log(`Attempting to delete text content: ${contentId} from source: ${sourceId}`);

    // First, handle the vector store cleanup
    try {
      await deleteContent(sourceId, 'text', contentId);
      console.log(`Successfully handled vector store cleanup for text content ${contentId}`);
    } catch (vectorError) {
      console.error(`Error cleaning up vector store:`, vectorError);
      // Continue with deletion even if vector store cleanup fails
    }

    // Then delete text content from the database
    await db.textContent.delete({
      where: {
        id: contentId,
        knowledgeSourceId: sourceId,
      },
    });

    console.log(`Successfully deleted text content: ${contentId}`);
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