import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from 'next/server';
import { deleteContent } from '@/lib/vector-service';
import { deleteFromSupabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for vector operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to delete crawler vectors by pattern
async function deleteCrawlerVectors(knowledgeSourceId: string, crawlerId: string): Promise<void> {
  console.log(`[deleteCrawlerVectors] Deleting vectors for crawler ${crawlerId}`);
  
  try {
    // Find all vector documents for this crawler (content_id starts with 'crawler-{crawlerId}-')
    const { data: vectors, error: queryError } = await supabase
      .from('vector_documents')
      .select('id, content_id')
      .eq('knowledge_source_id', knowledgeSourceId)
      .eq('content_type', 'website')
      .like('content_id', `crawler-${crawlerId}-%`);

    if (queryError) {
      console.error('[deleteCrawlerVectors] Error querying vectors:', queryError);
      return;
    }

    if (!vectors || vectors.length === 0) {
      console.log(`[deleteCrawlerVectors] No vectors found for crawler ${crawlerId}`);
      return;
    }

    console.log(`[deleteCrawlerVectors] Found ${vectors.length} vectors for crawler ${crawlerId}`);

    // Delete all found vectors
    for (const vector of vectors) {
      try {
        await deleteContent(knowledgeSourceId, 'website', vector.content_id);
        console.log(`[deleteCrawlerVectors] Deleted vector with content_id: ${vector.content_id}`);
      } catch (error) {
        console.error(`[deleteCrawlerVectors] Error deleting vector ${vector.content_id}:`, error);
      }
    }

    console.log(`[deleteCrawlerVectors] Successfully processed ${vectors.length} vectors for crawler ${crawlerId}`);
  } catch (error) {
    console.error('[deleteCrawlerVectors] Error:', error);
    throw error;
  }
}

const routeContextSchema = z.object({
  params: z.object({
    sourceId: z.string(),
  }),
});

const updateSourceSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
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
  } catch (error: unknown) {
    // If the table doesn't exist, no one has access
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return false;
    }
    throw error;
  }
}

// GET handler to fetch a specific knowledge source
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

    try {
      // Verify user has access to the knowledge source
      const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
      if (!hasAccess) {
        return new Response("Unauthorized", { status: 403 });
      }

      // Fetch the knowledge source
      // @ts-ignore - The knowledgeSource model exists in the schema but TypeScript doesn't know about it yet
      const source = await db.knowledgeSource.findUnique({
        where: {
          id: sourceId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!source) {
        return new Response("Knowledge source not found", { status: 404 });
      }

      return new Response(JSON.stringify(source), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (dbError: unknown) {
      // Check if the error is because the table doesn't exist
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2021') {
        console.error("Database table does not exist:", dbError);
        return new Response("Database tables not created. Please run 'npx prisma db push'", { status: 500 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error fetching knowledge source:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// PATCH handler to update a knowledge source
export async function PATCH(
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

    try {
      // Verify user has access to the knowledge source
      const hasAccess = await verifyUserHasAccessToSource(sourceId, session.user.id);
      if (!hasAccess) {
        return new Response("Unauthorized", { status: 403 });
      }

      // Parse request body
      const json = await req.json();
      const body = updateSourceSchema.parse(json);

      // Update the knowledge source
      // @ts-ignore - The knowledgeSource model exists in the schema but TypeScript doesn't know about it yet
      const updatedSource = await db.knowledgeSource.update({
        where: {
          id: sourceId,
        },
        data: {
          name: body.name,
          description: body.description,
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return new Response(JSON.stringify(updatedSource), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (dbError: unknown) {
      // Check if the error is because the table doesn't exist
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2021') {
        console.error("Database table does not exist:", dbError);
        return new Response("Database tables not created. Please run 'npx prisma db push'", { status: 500 });
      }
      throw dbError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Error updating knowledge source:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// DELETE handler to delete a knowledge source
export async function DELETE(
  req: Request,
  { params }: { params: { sourceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the knowledge source with its files and vector store ID
    const knowledgeSource = await db.knowledgeSource.findUnique({
      where: { id: params.sourceId },
      include: {
        files: {
          include: {
            crawler: true // Include crawler data to clean up crawler records
          }
        },
        textContents: true,
        qaContents: true,
        websiteContents: true,
        catalogContents: true
      }
    });

    if (!knowledgeSource) {
      return new NextResponse('Knowledge source not found', { status: 404 });
    }

    console.log(`Starting deletion of knowledge source ${params.sourceId}`);

    // First, handle crawler cleanup (before regular file cleanup)
    const crawlerIds = new Set<string>();
    const crawlerFiles = new Set<string>();
    
    for (const file of knowledgeSource.files) {
      if (file.crawler) {
        crawlerIds.add(file.crawler.id);
        crawlerFiles.add(file.id);
      }
    }

    if (crawlerIds.size > 0) {
      console.log(`Found ${crawlerIds.size} crawler(s) with ${crawlerFiles.size} files to clean up for knowledge source ${params.sourceId}`);
      
      // Clean up crawler vectors first (using pattern matching)
      for (const crawlerId of crawlerIds) {
        try {
          // Use helper function to find and delete all vectors for this crawler
          await deleteCrawlerVectors(params.sourceId, crawlerId);
          console.log(`Removed crawler vectors for crawler ${crawlerId} from vector store`);
        } catch (error) {
          console.error(`Error removing crawler ${crawlerId} vectors from vector store:`, error);
        }
      }

      // Delete crawler files from storage
      for (const file of knowledgeSource.files) {
        if (file.crawler && crawlerFiles.has(file.id)) {
          try {
            // @ts-ignore - Type might not include storageProvider and storageUrl properties yet
            const storageProvider = file.storageProvider;
            // @ts-ignore - Type might not include storageProvider and storageUrl properties yet
            const storageUrl = file.storageUrl;
            
            if (storageProvider === 'supabase' && storageUrl) {
              await deleteFromSupabase(storageUrl, 'files');
              console.log(`Deleted crawler file from Supabase: ${storageUrl}`);
            }
          } catch (error) {
            console.error(`Error deleting crawler file ${file.id} from storage:`, error);
          }
        }
      }
      
      // Delete crawler records (this will cascade delete their file records from DB)
      for (const crawlerId of crawlerIds) {
        try {
          await db.crawler.delete({
            where: { id: crawlerId }
          });
          console.log(`Deleted crawler record: ${crawlerId}`);
        } catch (error) {
          console.error(`Error deleting crawler ${crawlerId}:`, error);
        }
      }
    }

    // Clean up all remaining vector documents for this knowledge source
    try {
      console.log(`Cleaning up remaining vector documents for knowledge source ${params.sourceId}`);
      
      // Delete vector documents for non-crawler files
      for (const file of knowledgeSource.files) {
        // Skip files that were handled by crawler cleanup
        if (crawlerFiles.has(file.id)) continue;
        
        try {
          await deleteContent(params.sourceId, 'file', file.id);
          console.log(`Removed file ${file.id} from vector store`);
        } catch (error) {
          console.error(`Error removing file ${file.id} from vector store:`, error);
        }
      }

      for (const textContent of knowledgeSource.textContents) {
        try {
          await deleteContent(params.sourceId, 'text', textContent.id);
          console.log(`Removed text content ${textContent.id} from vector store`);
        } catch (error) {
          console.error(`Error removing text content ${textContent.id} from vector store:`, error);
        }
      }

      for (const qaContent of knowledgeSource.qaContents) {
        try {
          await deleteContent(params.sourceId, 'qa', qaContent.id);
          console.log(`Removed QA content ${qaContent.id} from vector store`);
        } catch (error) {
          console.error(`Error removing QA content ${qaContent.id} from vector store:`, error);
        }
      }

      for (const websiteContent of knowledgeSource.websiteContents) {
        try {
          await deleteContent(params.sourceId, 'website', websiteContent.id);
          console.log(`Removed website content ${websiteContent.id} from vector store`);
        } catch (error) {
          console.error(`Error removing website content ${websiteContent.id} from vector store:`, error);
        }
      }

      for (const catalogContent of knowledgeSource.catalogContents) {
        try {
          await deleteContent(params.sourceId, 'catalog', catalogContent.id);
          console.log(`Removed catalog content ${catalogContent.id} from vector store`);
        } catch (error) {
          console.error(`Error removing catalog content ${catalogContent.id} from vector store:`, error);
        }
      }

      console.log(`Vector cleanup completed for knowledge source ${params.sourceId}`);
    } catch (error) {
      console.error(`Error during vector cleanup:`, error);
    }

    // Delete remaining files from storage (non-crawler files)
    for (const file of knowledgeSource.files) {
      // Skip files that were handled by crawler cleanup
      if (crawlerFiles.has(file.id)) continue;
      
      try {
        // Check if the file has storage provider and URL properties
        // @ts-ignore - Type might not include storageProvider and storageUrl properties yet
        const storageProvider = file.storageProvider;
        // @ts-ignore - Type might not include storageProvider and storageUrl properties yet
        const storageUrl = file.storageUrl;
        
        // If file is stored in Supabase
        if (storageProvider === 'supabase' && storageUrl) {
          await deleteFromSupabase(storageUrl, 'files');
          console.log(`Deleted file from Supabase: ${storageUrl}`);
        }
        
        // For other storage providers like Vercel Blob, deletion happens automatically
        // through database cascading deletes
        console.log(`File ${file.id} will be deleted from database`);
      } catch (error) {
        console.error(`Error deleting file ${file.id} from storage:`, error);
      }
    }

    // Delete all related content first (explicitly to ensure proper cleanup)
    // Some of these may be handled by cascade deletes, but we're being thorough

    // Get products related to catalog contents for this source
    const products = await db.product.findMany({
      where: {
        catalogContent: {
          knowledgeSourceId: params.sourceId
        }
      }
    });
    
    if (products.length > 0) {
      // Delete product images first
      for (const product of products) {
        if (product.imageUrl) {
          try {
            await deleteFromSupabase(product.imageUrl, 'files');
            console.log(`Deleted product image: ${product.imageUrl}`);
          } catch (error) {
            console.error(`Error deleting product image ${product.imageUrl}:`, error);
          }
        }
      }
      
      await db.product.deleteMany({
        where: {
          catalogContent: {
            knowledgeSourceId: params.sourceId
          }
        }
      });
      console.log(`Deleted ${products.length} products related to source ${params.sourceId}`);
    }

    // Delete all the content types
    await db.catalogContent.deleteMany({
      where: { knowledgeSourceId: params.sourceId }
    });
    console.log(`Deleted catalog content for source ${params.sourceId}`);

    await db.websiteContent.deleteMany({
      where: { knowledgeSourceId: params.sourceId }
    });
    console.log(`Deleted website content for source ${params.sourceId}`);

    await db.qAContent.deleteMany({
      where: { knowledgeSourceId: params.sourceId }
    });
    console.log(`Deleted QA content for source ${params.sourceId}`);

    await db.textContent.deleteMany({
      where: { knowledgeSourceId: params.sourceId }
    });
    console.log(`Deleted text content for source ${params.sourceId}`);

    // Delete remaining files from the database (crawler files already deleted by cascade)
    await db.file.deleteMany({
      where: { 
        knowledgeSourceId: params.sourceId,
        crawlerId: null // Only delete files that aren't associated with crawlers
      }
    });
    console.log(`Deleted remaining non-crawler files for source ${params.sourceId}`);

    // Finally, delete the knowledge source
    await db.knowledgeSource.delete({
      where: { id: params.sourceId }
    });
    console.log(`Knowledge source ${params.sourceId} successfully deleted`);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting knowledge source:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to delete knowledge source' }),
      { status: 500 }
    );
  }
} 