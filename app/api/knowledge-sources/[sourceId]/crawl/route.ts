import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as z from "zod";

// Define the schema for crawler request validation
const crawlerSchema = z.object({
  sourceId: z.string(),
  crawlUrl: z.string().url(),
  selector: z.string().default("body"),
  urlMatch: z.string(),
  maxPagesToCrawl: z.number().int().min(1).max(50).default(10)
});

export async function POST(
  req: Request,
  { params }: { params: { sourceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { sourceId } = params;
    
    // Check if the knowledge source exists and belongs to the user
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        userId: session.user.id
      }
    });

    if (!knowledgeSource) {
      return new NextResponse("Knowledge source not found", { status: 404 });
    }

    const json = await req.json();
    const body = crawlerSchema.parse(json);

    // Create a crawler record
    const crawler = await db.crawler.create({
      data: {
        name: `Crawler for ${body.crawlUrl}`,
        crawlUrl: body.crawlUrl,
        selector: body.selector,
        urlMatch: body.urlMatch,
        maxPagesToCrawl: body.maxPagesToCrawl,
        userId: session.user.id
      }
    });

    // Create a file record that will be populated with the crawled content
    const file = await db.file.create({
      data: {
        name: `Crawled content from ${new URL(body.crawlUrl).hostname}`,
        userId: session.user.id,
        openAIFileId: `crawl_${Date.now()}`, // Placeholder ID until actual file is created
        blobUrl: "", // Will be populated when crawling is complete
        crawlerId: crawler.id,
        knowledgeSourceId: sourceId
      }
    });

    // In a production environment, you would start a background job to crawl the website
    // For now, we'll just return success and the file ID
    
    return NextResponse.json({
      success: true,
      message: "Crawler started successfully",
      fileId: file.id,
      crawlerId: crawler.id
    });
  } catch (error) {
    console.error("[CRAWLER_POST]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 422 });
    }
    
    return new NextResponse("Internal error", { status: 500 });
  }
} 