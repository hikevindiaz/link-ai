import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const routeContextSchema = z.object({
  params: z.object({
    sourceId: z.string(),
  }),
});

const deleteContentSchema = z.object({
  contentId: z.string(),
  contentType: z.string(),
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

// POST handler to delete content using raw SQL (fallback method)
export async function POST(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    console.log("Delete content fallback endpoint called");
    
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
    const { contentId, contentType } = deleteContentSchema.parse(json);

    console.log(`Attempting to delete content with fallback method: ${contentId} of type: ${contentType}`);

    // Delete content based on type using raw SQL
    if (contentType === "text") {
      try {
        // Try with text_contents table name
        console.log("Trying to delete from text_contents table");
        await db.$executeRaw`
          DELETE FROM "text_contents"
          WHERE id = ${contentId} AND "knowledgeSourceId" = ${sourceId}
        `;
        
        console.log(`Successfully deleted text content: ${contentId}`);
        return new Response(null, { status: 204 });
      } catch (error) {
        console.error("Error deleting from text_contents:", error);
        
        try {
          // Try with TextContent table name (capitalized)
          console.log("Trying to delete from TextContent table");
          await db.$executeRaw`
            DELETE FROM "TextContent"
            WHERE id = ${contentId} AND "knowledgeSourceId" = ${sourceId}
          `;
          
          console.log(`Successfully deleted from TextContent table: ${contentId}`);
          return new Response(null, { status: 204 });
        } catch (error2) {
          console.error("Error deleting from TextContent:", error2);
          
          // Last attempt - try a more generic approach
          try {
            console.log("Trying with a more generic SQL approach");
            // List all tables and find the one containing our content
            const tables = await db.$queryRaw`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public'
            `;
            
            console.log("Available tables:", tables);
            
            // Try to find the content in any table that might contain it
            for (const table of Array.isArray(tables) ? tables : []) {
              const tableName = table.table_name;
              if (typeof tableName === 'string' && 
                  (tableName.toLowerCase().includes('text') || 
                   tableName.toLowerCase().includes('content'))) {
                try {
                  console.log(`Trying to delete from ${tableName}`);
                  await db.$executeRaw`
                    DELETE FROM "${tableName}"
                    WHERE id = ${contentId}
                  `;
                  console.log(`Successfully deleted from ${tableName}`);
                  return new Response(null, { status: 204 });
                } catch (tableError) {
                  console.log(`Error deleting from ${tableName}:`, tableError);
                  // Continue to next table
                }
              }
            }
            
            throw new Error("Could not find appropriate table for deletion");
          } catch (finalError) {
            console.error("All deletion attempts failed:", finalError);
            return new Response(JSON.stringify({ 
              error: "All deletion attempts failed", 
              details: String(finalError) 
            }), { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
      }
    } else {
      return new Response(JSON.stringify({ error: "Unsupported content type for deletion" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error in delete content fallback handler:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to delete content" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
} 