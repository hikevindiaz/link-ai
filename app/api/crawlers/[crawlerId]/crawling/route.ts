import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
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
    
    // Format into a markdown file for better OpenAI processing
    const markdownContent = `# Crawled Content from ${crawler.crawlUrl}\n\n${content}`;
    
    try {
      // Create an OpenAI file with the content
      const openai = getOpenAIClient();
      const fileName = `crawled-content-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
      
      // Create a file with the content
      const file_blob = new Blob([markdownContent], { type: 'text/markdown' });
      const openai_file = new File([file_blob], fileName, { type: 'text/markdown' });
      
      // Upload the file to OpenAI
      const uploadedFile = await openai.files.create({
        file: openai_file,
        purpose: "assistants",
      });
      
      console.log(`Created OpenAI file: ${uploadedFile.id}`);
      
      // Update the file with the crawled content
      await db.file.update({
        where: { id: file.id },
        data: {
          openAIFileId: uploadedFile.id,
          blobUrl: crawler.crawlUrl, // Use the crawl URL as the blob URL for now
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
        
        // Update the knowledge source's vectorStoreUpdatedAt timestamp
        await db.knowledgeSource.update({
          where: { id: file.knowledgeSourceId },
          data: {
            vectorStoreUpdatedAt: new Date()
          }
        });
        
        // Try to update the file to associate it with the vector store
        try {
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
        message: "Content crawled and added to knowledge base successfully",
        fileId: file.id,
        openAIFileId: uploadedFile.id,
        content: content.substring(0, 200) + "..." // Preview of content
      });
    } catch (fileError) {
      console.error('Error creating OpenAI file:', fileError);
      return NextResponse.json({ 
        success: false,
        message: "Error saving content to OpenAI",
        error: fileError instanceof Error ? fileError.message : "Unknown error"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[CRAWLING_POST]", error);
    return NextResponse.json({ 
      success: false,
      message: "Error processing crawler request",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}