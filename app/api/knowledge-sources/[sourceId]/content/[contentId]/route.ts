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
        console.log(`File not found: ${contentId} in source: ${sourceId}`);
        return new Response(
          JSON.stringify({ error: "File not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const file = files[0] as { id: string; blobUrl: string; openAIFileId: string };
      console.log(`Found file to delete: ${file.id} (${file.openAIFileId})`);
      
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
        return new Response(
          JSON.stringify({ error: "Missing OpenAI API key" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Handle vector store deletion
      let vectorStoreSuccess = true;
      let vectorStoreError = null;
      
      // Get vector store ID
      if (Array.isArray(knowledgeSources) && knowledgeSources.length > 0) {
        const knowledgeSource = knowledgeSources[0] as { id: string; vectorStoreId: string | null };
        
        // If there's a vector store ID, remove the file from it
        if (knowledgeSource.vectorStoreId && file.openAIFileId) {
          try {
            console.log(`Removing file ${file.openAIFileId} from vector store ${knowledgeSource.vectorStoreId}`);
            
            // Handle potential format mismatch for file ID
            let fileIdToDelete = file.openAIFileId;
            // Convert file_123 to file-123 for OpenAI API if needed
            if (fileIdToDelete.startsWith('file_')) {
              fileIdToDelete = fileIdToDelete.replace('file_', 'file-');
              console.log(`Reformatted file ID for vector store from ${file.openAIFileId} to ${fileIdToDelete}`);
            }
            
            const removed = await removeFileFromVectorStore(knowledgeSource.vectorStoreId, fileIdToDelete);
            if (removed) {
              console.log(`Successfully removed file ${fileIdToDelete} from vector store ${knowledgeSource.vectorStoreId}`);
            } else {
              console.warn(`Failed to remove file from vector store, continuing with deletion from database`);
              vectorStoreSuccess = false;
              vectorStoreError = "File not found in vector store or removal failed";
            }
          } catch (vectorError) {
            console.error("Error removing file from vector store:", vectorError);
            vectorStoreSuccess = false;
            vectorStoreError = vectorError instanceof Error ? vectorError.message : "Unknown vector store error";
            // Continue with deletion even if vector store removal fails
          }
        } else {
          console.log(`No vector store found for knowledge source ${sourceId} or file has no OpenAI ID`);
        }
      }

      // Delete the file from Vercel Blob if it has a valid URL
      let blobSuccess = true;
      let blobError = null;
      if (file.blobUrl && file.blobUrl.startsWith('http')) {
        try {
          console.log(`Deleting file from Blob storage: ${file.blobUrl}`);
          await del(file.blobUrl);
          console.log(`Successfully deleted file from Blob storage`);
        } catch (error) {
          console.error('Error deleting file from blob storage:', error);
          blobSuccess = false;
          blobError = error instanceof Error ? error.message : "Unknown blob error";
          // Continue with database deletion even if blob deletion fails
        }
      }

      // Delete the OpenAI file if possible
      let openaiSuccess = true;
      let openaiError = null;
      try {
        console.log(`Deleting file from OpenAI: ${file.openAIFileId}`);
        const openai = getOpenAIClient();
        
        // Format the file ID properly for OpenAI
        // OpenAI expects file IDs to start with 'file-' but they might be stored with 'file_'
        let openAIFileId = file.openAIFileId;
        if (openAIFileId.startsWith('file_')) {
          // Convert file_123 to file-123 for OpenAI API
          openAIFileId = openAIFileId.replace('file_', 'file-');
          console.log(`Reformatted file ID from ${file.openAIFileId} to ${openAIFileId}`);
        }
        
        await openai.files.del(openAIFileId);
        console.log(`Successfully deleted file from OpenAI`);
      } catch (error) {
        console.error(`Error deleting OpenAI file:`, error);
        openaiSuccess = false;
        openaiError = error instanceof Error ? error.message : "Unknown OpenAI error";
        // Continue with database deletion even if OpenAI deletion fails
      }

      // Delete the file from the database
      try {
        console.log(`Deleting file from database: ${file.id}`);
        await db.$executeRaw`
          DELETE FROM "files"
          WHERE id = ${contentId}
        `;
        console.log(`Successfully deleted file from database`);
        
        // Return success but include details about partial failures if any
        if (!vectorStoreSuccess || !blobSuccess || !openaiSuccess) {
          return new Response(
            JSON.stringify({
              message: "File deleted with warnings",
              details: {
                database: "success",
                vectorStore: vectorStoreSuccess ? "success" : `failed: ${vectorStoreError}`,
                blobStorage: blobSuccess ? "success" : `failed: ${blobError}`,
                openai: openaiSuccess ? "success" : `failed: ${openaiError}`
              }
            }),
            { 
              status: 207, // Partial Content
              headers: { "Content-Type": "application/json" }
            }
          );
        }
        
        return new Response(null, { status: 204 });
      } catch (dbError) {
        console.error(`Error deleting file from database: ${dbError}`);
        return new Response(
          JSON.stringify({ error: "Failed to delete file from database", details: String(dbError) }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
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
        error: error instanceof Error ? error.message : "Failed to delete content",
        details: error instanceof Error ? error.stack : "No stack trace available"
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
} 