import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOpenAIClient } from "@/lib/openai";
import { ensureVectorStore } from "@/lib/knowledge-vector-integration";
import { addFileToVectorStore } from "@/lib/vector-store";
import * as cheerio from 'cheerio';

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export async function POST(
  req: Request,
  { params }: { params: { crawlerId: string } }
) {
  let createdFile = null;
  
  try {
    // Check for user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get crawler details with associated file
    const crawler = await db.crawler.findFirst({
      where: { 
        id: params.crawlerId,
        userId: session.user.id
      },
      include: {
        File: {
          select: {
            id: true,
            knowledgeSourceId: true,
            openAIFileId: true
          }
        }
      }
    });

    if (!crawler) {
      return NextResponse.json({ error: "Crawler not found" }, { status: 404 });
    }

    // Get the existing file and knowledge source ID
    const existingFile = crawler.File[0];
    if (!existingFile?.knowledgeSourceId) {
      return NextResponse.json({ error: "No associated knowledge source found" }, { status: 400 });
    }

    const knowledgeSourceId = existingFile.knowledgeSourceId;

    try {
      // First ensure vector store exists
      console.log('Ensuring vector store exists for knowledge source:', knowledgeSourceId);
      const vectorStoreId = await ensureVectorStore(knowledgeSourceId);
      if (!vectorStoreId) {
        throw new Error('Failed to create or access vector store');
      }
      console.log('Vector store ID:', vectorStoreId);

      // Fetch the webpage content
      console.log('Fetching content from URL:', crawler.crawlUrl);
      const response = await fetch(crawler.crawlUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Extract text content from the body or specified selector
      const selector = crawler.selector || 'body';
      let content = $(selector).text();
      
      // Clean up the content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      // Format into a markdown file for better OpenAI processing
      const markdownContent = `# Crawled Content from ${crawler.crawlUrl}\n\n${content}`;
      
      // Create an OpenAI file with the content
      console.log('Creating OpenAI file...');
      const openai = getOpenAIClient();
      const fileName = `crawled-content-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
      
      // Create a file with the content
      const file_blob = new Blob([markdownContent], { type: 'text/markdown' });
      const openai_file = new File([file_blob], fileName, { type: 'text/markdown' });
      
      // Upload the file to OpenAI with retry logic
      const uploadedFile = await retryWithBackoff(async () => {
        return await openai.files.create({
          file: openai_file,
          purpose: "assistants",
        });
      });
      
      console.log(`Created OpenAI file: ${uploadedFile.id}`);

      // Update the existing file record
      const file = await db.file.update({
        where: { id: existingFile.id },
        data: {
          openAIFileId: uploadedFile.id,
          blobUrl: crawler.crawlUrl
        }
      });
      createdFile = file;

      // Add content to vector store with retry logic
      console.log(`Adding file ${uploadedFile.id} to vector store ${vectorStoreId}...`);
      await retryWithBackoff(async () => {
        await addFileToVectorStore(vectorStoreId, uploadedFile.id);
      });
      console.log('Successfully added file to vector store');
      
      // Update the knowledge source's vectorStoreUpdatedAt timestamp
      await db.knowledgeSource.update({
        where: { id: knowledgeSourceId },
        data: {
          vectorStoreId: vectorStoreId,
          vectorStoreUpdatedAt: new Date()
        }
      });
      
      return NextResponse.json({
        success: true,
        message: "Content crawled and added to knowledge base successfully",
        fileId: file.id,
        openAIFileId: uploadedFile.id,
        vectorStoreId: vectorStoreId,
        content: content.substring(0, 200) + "..." // Preview of content
      });
    } catch (error) {
      console.error('Error in crawling process:', error);
      // Clean up any created files if we failed
      if (createdFile?.id) {
        try {
          await db.file.delete({
            where: { id: createdFile.id }
          });
        } catch (deleteError) {
          console.error('Error cleaning up file:', deleteError);
        }
      }
      
      // Log the full error details
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      }

      // Return a more detailed error response
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : "Failed to crawl website",
        details: error.response?.data || error,
        cause: error.cause
      }, { status: error.status || 500 });
    }
  } catch (error) {
    console.error('Error in crawler:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to crawl website",
      details: error
    }, { status: 500 });
  }
}