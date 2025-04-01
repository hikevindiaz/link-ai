import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const routeContextSchema = z.object({
  params: z.object({
    sourceId: z.string(),
  }),
});

// Schema for website URL validation
const websiteSchema = z.object({
  urls: z.array(z.string().url("Invalid URL format")).min(1, "At least one URL is required"),
}).or(
  // Alternative schema for backward compatibility
  z.object({
    url: z.string().url("Invalid URL format"),
    searchType: z.string().optional()
  })
);

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

// GET handler to fetch website content for a knowledge source
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

    // Fetch only website content from the WebsiteContent table
    const websiteContent = await db.websiteContent.findMany({
      where: {
        knowledgeSourceId: sourceId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return new Response(JSON.stringify(websiteContent), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching website content:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// POST handler to create new website content
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
    const body = websiteSchema.parse(json);

    // Determine which URLs to process based on the schema
    let urlsToProcess: string[] = [];
    if ('urls' in body && Array.isArray(body.urls)) {
      urlsToProcess = body.urls;
    } else if ('url' in body && typeof body.url === 'string') {
      urlsToProcess = [body.url];
    } else {
      throw new Error('Invalid request format - no valid URLs provided');
    }

    // Create website content entries for each URL
    const results = await Promise.all(
      urlsToProcess.map(async (url) => {
        try {
          const websiteContent = await db.websiteContent.create({
            data: {
              url: url,
              knowledgeSource: {
                connect: {
                  id: sourceId,
                },
              },
            },
          });
          return { success: true, url, id: websiteContent.id };
        } catch (error) {
          console.error(`Error saving URL ${url}:`, error);
          return { success: false, url, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return new Response(JSON.stringify({
      message: `${successCount} URL${successCount !== 1 ? 's' : ''} saved successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
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

    console.error("Error creating website content:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// DELETE handler to delete website content
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

    console.log(`Attempting to delete website content: ${contentId} from source: ${sourceId}`);

    // Delete website content
    await db.websiteContent.delete({
      where: {
        id: contentId,
        knowledgeSourceId: sourceId,
      },
    });

    console.log(`Successfully deleted website content: ${contentId}`);
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