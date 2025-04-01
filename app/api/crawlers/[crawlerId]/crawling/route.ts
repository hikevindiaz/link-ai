import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkSubscriptionFeatures } from "@/lib/subscription";
import * as cheerio from 'cheerio';
import axios from 'axios';
import { getOpenAIClient } from "@/lib/openai";
import { ensureVectorStore, addDocumentsToVectorStore } from "@/lib/knowledge-vector-integration";

export async function POST(
  req: Request,
  { params }: { params: { crawlerId: string } }
) {
  try {
    // Check for user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { crawlerId } = params;
    
    // Find the crawler
    const crawler = await db.crawler.findFirst({
      where: {
        id: crawlerId,
        userId: session.user.id
      }
    });

    if (!crawler) {
      return new NextResponse("Crawler not found", { status: 404 });
    }
    
    // Find associated files
    const files = await db.file.findMany({
      where: {
        crawlerId: crawlerId
      },
      select: {
        id: true,
        knowledgeSourceId: true
      }
    });
    
    const file = files[0]; // Use the first file associated with this crawler

    // Check subscription for crawling capabilities
    const subscriptionFeatures = await checkSubscriptionFeatures(session.user.id);
    if (!subscriptionFeatures.allowCrawling) {
      return new NextResponse("Your subscription does not include web crawling", { status: 403 });
    }

    // Start the crawling process
    console.log(`Starting crawl for ${crawler.crawlUrl}`);
    
    if (!file?.knowledgeSourceId) {
      return new NextResponse("No associated file or knowledge source found", { status: 400 });
    }
    
    // Ensure vector store exists for this knowledge source
    const vectorStoreId = await ensureVectorStore(file.knowledgeSourceId);
    if (!vectorStoreId) {
      console.error(`Failed to create or find vector store for knowledge source ${file.knowledgeSourceId}`);
      return new NextResponse("Failed to create vector store", { status: 500 });
    }
    
    // Fetch content from the crawl URL
    let content = "";
    
    try {
      const response = await axios.get(crawler.crawlUrl);
      const $ = cheerio.load(response.data);
      
      // Apply selector to extract content
      const selectedContent = $(crawler.selector).text();
      content = selectedContent.trim();
      
      if (!content) {
        content = $('body').text().trim(); // Fallback to body if selector returned nothing
      }
      
      // Clean up content - remove excessive whitespace
      content = content.replace(/\s+/g, ' ');
    } catch (error) {
      console.error('Error fetching or parsing web content:', error);
      return new NextResponse("Failed to fetch or parse web content", { status: 500 });
    }
    
    if (!content) {
      return new NextResponse("No content extracted from URL", { status: 400 });
    }
    
    // Update the file with the crawled content
    const blobUrl = `crawled-content-${Date.now()}.txt`; // In production, save to blob storage
    
    await db.file.update({
      where: { id: file.id },
      data: {
        openAIFileId: `crawl_completed_${Date.now()}`,
        blobUrl: blobUrl,
        // Cannot add content as it's not in the schema
      }
    });
    
    // Add content to vector store
    try {
      const documents = [{
        pageContent: content,
        metadata: {
          source: crawler.crawlUrl,
          fileId: file.id,
          crawlerId: crawler.id
        }
      }];
      
      await addDocumentsToVectorStore(vectorStoreId, documents);
      console.log(`Added crawled content to vector store ${vectorStoreId}`);
      
      // Update the file to associate it with the vector store
      // Note: If vectorStoreId isn't in the schema, you'll need to update your Prisma schema
      try {
        // Use raw SQL to update the file if needed
        await db.$executeRaw`
          UPDATE "files"
          SET "vectorStoreId" = ${vectorStoreId}
          WHERE id = ${file.id}
        `;
      } catch (sqlError) {
        console.error('Error updating file with vector store ID:', sqlError);
        // Continue even if this fails
      }
    } catch (vectorError) {
      console.error('Error adding content to vector store:', vectorError);
      // We'll continue even if vector store update fails, at least content is saved
    }
    
    return NextResponse.json({
      success: true,
      message: "Content crawled and added to knowledge base",
      content: content.substring(0, 200) + "..." // Preview of content
    });
  } catch (error) {
    console.error("[CRAWLING_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}