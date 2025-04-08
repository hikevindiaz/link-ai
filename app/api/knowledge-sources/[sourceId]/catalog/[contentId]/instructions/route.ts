import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { processContentToVectorStore } from "@/lib/knowledge-vector-integration";

const routeParamsSchema = z.object({
  sourceId: z.string(),
  contentId: z.string(),
});

const instructionsSchema = z.object({
  instructions: z.string().min(1, "Instructions are required"),
});

// PATCH endpoint to update only the instructions for a catalog content item
export async function PATCH(
  req: Request,
  { params }: { params: { sourceId: string; contentId: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Validate route parameters
    const { sourceId, contentId } = routeParamsSchema.parse(params);

    // Get the JSON body and validate
    const json = await req.json();
    const { instructions } = instructionsSchema.parse(json);

    // Verify user has access to this knowledge source
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        userId: session.user.id,
      },
      include: {
        catalogContents: {
          where: {
            id: contentId,
          },
        },
      },
    });

    if (!knowledgeSource || knowledgeSource.catalogContents.length === 0) {
      return new Response("Not found", { status: 404 });
    }

    // Update the catalog content with new instructions
    const updatedContent = await db.catalogContent.update({
      where: {
        id: contentId,
        knowledgeSourceId: sourceId,
      },
      data: {
        instructions,
      },
      include: {
        file: true,
        products: true,
      },
    });

    // If there's an associated file or products, update the vector store
    if (updatedContent.fileId || updatedContent.products.length > 0) {
      try {
        // Format catalog content for vector store
        const catalogData = {
          instructions,
          products: updatedContent.products,
          file: updatedContent.file,
        };

        // Update in vector store - process as 'catalog' type
        await processContentToVectorStore(sourceId, catalogData, 'catalog', contentId);

        // Update the last updated time for the vector store
        await db.knowledgeSource.update({
          where: { id: sourceId },
          data: { vectorStoreUpdatedAt: new Date() },
        });

        console.log(`Vector store updated with new catalog instructions for content ID: ${contentId}`);
      } catch (vectorError) {
        console.error("Error updating vector store with catalog instructions:", vectorError);
        // Continue even if vector store update fails - at least the DB is updated
      }
    }

    return NextResponse.json(updatedContent);
  } catch (error) {
    console.error("Error updating catalog instructions:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Failed to update catalog instructions" },
      { status: 500 }
    );
  }
} 