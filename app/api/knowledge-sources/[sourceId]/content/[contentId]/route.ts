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
      // Get the file details first to check for crawler association
      const fileDetails = await db.file.findUnique({
        where: { id: contentId },
        select: { crawlerId: true, openAIFileId: true }
      });

      if (fileDetails?.crawlerId) {
        console.log(`File has an associated crawler with ID: ${fileDetails.crawlerId}. Deleting crawler too.`);
        
        try {
          // Delete the crawler first
          await db.crawler.delete({
            where: { id: fileDetails.crawlerId }
          });
          console.log(`Successfully deleted crawler: ${fileDetails.crawlerId}`);
        } catch (crawlerError) {
          console.error('Error deleting associated crawler:', crawlerError);
          // Continue with file deletion even if crawler deletion fails
        }
      }

      // Try to delete the OpenAI file if available
      if (fileDetails?.openAIFileId && !fileDetails.openAIFileId.startsWith('crawl_')) {
        try {
          const openai = getOpenAIClient();
          await openai.files.del(fileDetails.openAIFileId);
          console.log(`Deleted OpenAI file: ${fileDetails.openAIFileId}`);
        } catch (openaiError) {
          console.error('Error deleting OpenAI file:', openaiError);
          // Continue with file deletion even if OpenAI file deletion fails
        }
      }

      // Delete the file from DB
      try {
        await db.file.delete({
          where: {
            id: contentId,
            knowledgeSourceId: sourceId,
          },
        });
        
        console.log(`Successfully deleted file content: ${contentId}`);
      } catch (error) {
        console.error('Error deleting file content:', error);
        return new Response(
          JSON.stringify({ error: "Failed to delete file content" }),
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