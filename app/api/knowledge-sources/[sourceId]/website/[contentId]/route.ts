import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const routeContextSchema = z.object({
  params: z.object({
    sourceId: z.string(),
    contentId: z.string(),
  }),
});

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

// DELETE handler to delete website content by ID
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
    const { sourceId, contentId } = params;

    console.log(`Processing delete request for website content: ${contentId} from source: ${sourceId}`);

    // If it starts with "temp-", it's a temporary ID that hasn't been saved to the database yet
    // We can return success since it doesn't need to be deleted from the DB
    if (contentId.startsWith("temp-")) {
      console.log(`Content ID ${contentId} is temporary, no deletion needed from database`);
      return new Response(null, { status: 204 });
    }

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    console.log(`Attempting to delete website content: ${contentId} from source: ${sourceId}`);

    try {
      // Delete website content
      await db.websiteContent.delete({
        where: {
          id: contentId,
          knowledgeSourceId: sourceId,
        },
      });

      console.log(`Successfully deleted website content: ${contentId}`);
      return new Response(null, { status: 204 });
    } catch (dbError) {
      console.error("Database error during website content deletion:", dbError);
      
      // Check if the content exists
      const contentExists = await db.websiteContent.findUnique({
        where: {
          id: contentId,
        },
      });
      
      if (!contentExists) {
        // If the content doesn't exist, return 204 (successful deletion)
        // This handles cases where the content might have been deleted already
        console.log(`Content ${contentId} not found in database, considering it already deleted`);
        return new Response(null, { status: 204 });
      }
      
      throw dbError; // Re-throw if it's a different issue
    }
  } catch (error) {
    console.error("Error in DELETE handler:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to delete content",
      stack: error instanceof Error ? error.stack : undefined
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 