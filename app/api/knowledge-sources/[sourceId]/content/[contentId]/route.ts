import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { del } from '@vercel/blob';
import { removeFileFromVectorStore } from "@/lib/vector-store";
import OpenAI from "openai";
import { getOpenAIClient } from "@/lib/openai";

const routeContextSchema = z.object({
  params: z.object({
    sourceId: z.string(),
    contentId: z.string(),
  }),
});

// Verify user has access to the knowledge source
async function verifyUserHasAccessToSource(sourceId: string, userId: string) {
  try {
    // @ts-ignore - The knowledgeSource model exists in the schema but TypeScript doesn't know about it yet
    const count = await db.knowledgeSource.count({
      where: {
        id: sourceId,
        userId: userId,
      },
    });

    return count > 0;
  } catch (error) {
    console.error("Error verifying access:", error);
    return false;
  }
}

// DELETE endpoint to remove content (text, QA pairs, etc.)
export async function DELETE(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    console.log("DELETE request received for content");
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("Unauthorized: No session or user");
      return new Response("Unauthorized", { status: 403 });
    }

    // Validate route params
    const { params } = routeContextSchema.parse(context);
    const { sourceId, contentId } = params;
    
    console.log(`Params received - sourceId: ${sourceId}, contentId: ${contentId}`);

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      console.log("Unauthorized: User does not have access to this source");
      return new Response("Unauthorized", { status: 403 });
    }

    console.log(`Attempting to delete content: ${contentId} from source: ${sourceId}`);

    // Check content type from query params
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "file";

    if (type === "file") {
      // Get the file and knowledge source to delete
      const knowledgeSources = await db.$queryRaw`
        SELECT ks.id, ks."vectorStoreId" 
        FROM "knowledge_sources" ks
        WHERE ks.id = ${sourceId}
      `;

      const files = await db.$queryRaw`
        SELECT id, "blobUrl", "openAIFileId"
        FROM "files"
        WHERE id = ${contentId} AND "knowledgeSourceId" = ${sourceId}
      `;

      if (!Array.isArray(files) || files.length === 0) {
        return new Response("File not found", { status: 404 });
      }

      const file = files[0] as { id: string; blobUrl: string; openAIFileId: string };
      
      // Get OpenAI API key for the user
      const openAIConfig = await db.openAIConfig.findUnique({
        select: {
          globalAPIKey: true,
        },
        where: {
          userId: session.user.id
        }
      });

      if (!openAIConfig?.globalAPIKey) {
        console.error("Missing OpenAI API key");
        return new Response("Missing OpenAI API key", { status: 400 });
      }

      // Get vector store ID
      if (Array.isArray(knowledgeSources) && knowledgeSources.length > 0) {
        const knowledgeSource = knowledgeSources[0] as { id: string; vectorStoreId: string | null };
        
        // If there's a vector store ID, remove the file from it
        if (knowledgeSource.vectorStoreId && file.openAIFileId) {
          try {
            console.log(`Removing file ${file.openAIFileId} from vector store ${knowledgeSource.vectorStoreId}`);
            const removed = await removeFileFromVectorStore(knowledgeSource.vectorStoreId, file.openAIFileId);
            if (!removed) {
              console.warn(`Failed to remove file from vector store, continuing with deletion from database`);
            }
          } catch (vectorError) {
            console.error("Error removing file from vector store:", vectorError);
            // Continue with deletion even if vector store removal fails
          }
        }
      }

      // Delete the file from Vercel Blob if it has a valid URL
      if (file.blobUrl && file.blobUrl.startsWith('http')) {
        try {
          await del(file.blobUrl);
        } catch (error) {
          console.error('Error deleting file from blob storage:', error);
          // Continue with database deletion even if blob deletion fails
        }
      }

      // Delete the OpenAI file if possible
      try {
        const openai = new OpenAI({
          apiKey: openAIConfig.globalAPIKey
        });
        await openai.files.del(file.openAIFileId);
      } catch (error) {
        console.error(`Error deleting OpenAI file: ${error}`);
        // Continue with database deletion even if OpenAI deletion fails
      }

      // Delete the file from the database
      await db.$executeRaw`
        DELETE FROM "files"
        WHERE id = ${contentId}
      `;
    } else if (type === "text") {
      // Delete text content
      try {
        await db.$executeRaw`
          DELETE FROM "text_contents"
          WHERE id = ${contentId} AND "knowledgeSourceId" = ${sourceId}
        `;
      } catch (error) {
        console.error('Error deleting text content:', error);
        return new Response(
          JSON.stringify({ error: "Failed to delete text content" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else if (type === "website") {
      // Delete website content
      try {
        await db.$executeRaw`
          DELETE FROM "website_contents"
          WHERE id = ${contentId} AND "knowledgeSourceId" = ${sourceId}
        `;
      } catch (error) {
        console.error('Error deleting website content:', error);
        return new Response(
          JSON.stringify({ error: "Failed to delete website content" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported content type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error in DELETE handler:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to delete content" 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
} 