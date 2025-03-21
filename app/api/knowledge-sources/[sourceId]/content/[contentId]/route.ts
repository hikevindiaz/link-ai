import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { del } from '@vercel/blob';

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
    const type = url.searchParams.get("type") || "file"; // Default to file if not specified

    if (type === "file") {
      // Get the file to delete
      const files = await db.$queryRaw`
        SELECT id, "blobUrl"
        FROM "files"
        WHERE id = ${contentId} AND "knowledgeSourceId" = ${sourceId}
      `;

      if (!Array.isArray(files) || files.length === 0) {
        return new Response("File not found", { status: 404 });
      }

      const file = files[0] as { id: string; blobUrl: string };

      // Delete the file from Vercel Blob if it has a valid URL
      if (file.blobUrl && file.blobUrl.startsWith('http')) {
        try {
          await del(file.blobUrl);
        } catch (error) {
          console.error('Error deleting file from blob storage:', error);
          // Continue with database deletion even if blob deletion fails
        }
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