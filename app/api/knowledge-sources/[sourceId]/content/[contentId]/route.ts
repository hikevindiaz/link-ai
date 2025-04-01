import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { del } from '@vercel/blob';
import { removeFileFromVectorStore } from "@/lib/vector-store";
import OpenAI from "openai";
import { getOpenAIClient } from "@/lib/openai";
import { NextResponse } from "next/server";

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
  { params }: { params: { sourceId: string; contentId: string } }
) {
  try {
    // Check for user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get file details first to check for associations
    const file = await db.file.findUnique({
      where: { 
        id: params.contentId
      },
      include: {
        crawler: true,
        knowledgeSource: true
      }
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Verify the file belongs to the correct knowledge source
    if (file.knowledgeSourceId !== params.sourceId) {
      return NextResponse.json({ error: "File does not belong to this knowledge source" }, { status: 403 });
    }

    // Delete associated crawler if it exists
    if (file.crawler) {
      try {
        await db.crawler.delete({
          where: { id: file.crawler.id }
        });
        console.log(`Deleted associated crawler: ${file.crawler.id}`);
      } catch (crawlerError) {
        console.error('Error deleting crawler:', crawlerError);
        // Continue with file deletion even if crawler deletion fails
      }
    }

    // If file is associated with a knowledge source with a vector store, clean up there
    if (file.knowledgeSource?.vectorStoreId && file.openAIFileId) {
      try {
        const removed = await removeFileFromVectorStore(
          file.knowledgeSource.vectorStoreId, 
          file.openAIFileId
        );
        
        if (removed) {
          console.log(`Removed file ${file.openAIFileId} from vector store ${file.knowledgeSource.vectorStoreId}`);
          
          // Update the knowledge source's vectorStoreUpdatedAt timestamp
          await db.knowledgeSource.update({
            where: { id: file.knowledgeSource.id },
            data: {
              vectorStoreUpdatedAt: new Date()
            }
          });
        } else {
          console.warn(`Failed to remove file from vector store - continuing with deletion`);
        }
      } catch (vectorError) {
        console.error('Error removing file from vector store:', vectorError);
        // Continue with file deletion even if vector store cleanup fails
      }
    }

    // Delete the OpenAI file if it exists
    if (file.openAIFileId) {
      try {
        const openai = getOpenAIClient();
        await openai.files.del(file.openAIFileId);
        console.log(`Deleted OpenAI file: ${file.openAIFileId}`);
      } catch (openaiError) {
        console.error('Error deleting OpenAI file:', openaiError);
        // Continue with file deletion even if OpenAI deletion fails
      }
    }

    try {
      // Finally delete the file from our database
      await db.file.delete({
        where: { 
          id: params.contentId
        }
      });
    } catch (deleteError) {
      console.error('Error deleting file from database:', deleteError);
      // If the file is already deleted, we can consider this a success
      if (deleteError.code === 'P2025') {
        return NextResponse.json({ 
          success: true,
          message: "File and associated resources deleted successfully"
        });
      }
      throw deleteError;
    }

    return NextResponse.json({ 
      success: true,
      message: "File and associated resources deleted successfully"
    });
  } catch (error) {
    console.error('Error in DELETE handler:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to delete file",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 