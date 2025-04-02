import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleQAContentDeletion } from "@/lib/knowledge-vector-integration";
import { Prisma } from "@prisma/client";

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
    const { sourceId, contentId } = params;

    // Check if the contentId starts with 'temp-' (temporary ID)
    if (contentId.startsWith('temp-')) {
      console.log(`Skipping deletion of temporary QA content with ID: ${contentId}`);
      return new Response(null, { status: 204 });
    }

    console.log(`Attempting to delete QA content: ${contentId} from source: ${sourceId}`);

    // Verify user has access to the knowledge source
    const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 403 });
    }

    // First, handle vector store cleanup
    try {
      await handleQAContentDeletion(sourceId, contentId);
      console.log(`Successfully handled vector store cleanup for QA content ${contentId}`);
    } catch (vectorError) {
      console.error(`Error cleaning up vector store:`, vectorError);
      // Continue with deletion even if vector store cleanup fails
    }

    // Delete QA content
    try {
      await db.qAContent.delete({
        where: {
          id: contentId,
          knowledgeSourceId: sourceId,
        },
      });
      console.log(`Successfully deleted QA content: ${contentId}`);
    } catch (deleteError) {
      // Handle case where the record doesn't exist
      if (deleteError instanceof Prisma.PrismaClientKnownRequestError && deleteError.code === 'P2025') {
        console.log(`QA content ${contentId} not found in database, may have been deleted already`);
        return new Response(null, { status: 204 });
      }
      throw deleteError; // Re-throw other errors
    }

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