import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteContent } from "@/lib/vector-service";
import { NextResponse } from "next/server";
import { deleteFromSupabase } from "@/lib/supabase";

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

    // Clean up from vector store
    try {
      if (file.crawler) {
        // For crawler files, we need to delete by crawler pattern since they use unique content IDs
        console.log(`Deleting crawler vector content for crawler: ${file.crawler.id}`);
        
        await db.$executeRaw`
          DELETE FROM embedding_jobs 
          WHERE knowledge_source_id = ${params.sourceId}
          AND content_type = 'website'
          AND content_id LIKE ${'crawler-' + file.crawler.id + '-%'}
        `;
        
        await db.$executeRaw`
          DELETE FROM vector_documents 
          WHERE knowledge_source_id = ${params.sourceId}
          AND content_type = 'website'
          AND content_id LIKE ${'crawler-' + file.crawler.id + '-%'}
        `;
        
        console.log(`Removed crawler vector content for crawler: ${file.crawler.id}`);
      } else {
        // For regular files, we need to delete both 'text' and 'file' type vector documents
        // because files create 'text' type vectors when we extract text locally
        try {
          await deleteContent(params.sourceId, 'text', file.id);
          console.log(`Removed text-type vector content for file ${file.id}`);
        } catch (textDeleteError) {
          console.error('Error deleting text-type vector content:', textDeleteError);
        }
        
        try {
          await deleteContent(params.sourceId, 'file', file.id);
          console.log(`Removed file-type vector content for file ${file.id}`);
        } catch (fileDeleteError) {
          console.error('Error deleting file-type vector content:', fileDeleteError);
        }
      }
    } catch (vectorError) {
      console.error('Error removing file from vector store:', vectorError);
      // Continue with file deletion even if vector store cleanup fails
    }

    // Delete the file from Supabase storage if it exists
    if (file.storageProvider === 'supabase' && file.storageUrl) {
      try {
        await deleteFromSupabase(file.storageUrl, 'files');
        console.log(`Deleted file from Supabase storage: ${file.storageUrl}`);
      } catch (storageError) {
        console.error('Error deleting file from Supabase storage:', storageError);
        // Continue with database deletion even if storage deletion fails
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