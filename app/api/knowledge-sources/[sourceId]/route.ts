import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { removeFileFromVectorStore } from '@/lib/vector-store';
import { deleteFromSupabase } from '@/lib/supabase';

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
        files: true,
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

    // If there's a vector store, delete all files from it first
    if (knowledgeSource.vectorStoreId) {
      const openai = getOpenAIClient();
      
      console.log(`Deleting files from vector store ${knowledgeSource.vectorStoreId}`);
      
      // Delete all files from the vector store
      for (const file of knowledgeSource.files) {
        if (file.openAIFileId) {
          try {
            await removeFileFromVectorStore(knowledgeSource.vectorStoreId!, file.openAIFileId);
            console.log(`Removed file ${file.openAIFileId} from vector store`);
          } catch (error) {
            console.error(`Error removing file ${file.openAIFileId} from vector store:`, error);
          }
        }
      }

      // Also remove OpenAI file IDs for text and QA content
      for (const textContent of knowledgeSource.textContents) {
        if (textContent.openAIFileId) {
          try {
            await removeFileFromVectorStore(knowledgeSource.vectorStoreId!, textContent.openAIFileId);
            console.log(`Removed text content file ${textContent.openAIFileId} from vector store`);
          } catch (error) {
            console.error(`Error removing text content file ${textContent.openAIFileId} from vector store:`, error);
          }
        }
      }

      for (const qaContent of knowledgeSource.qaContents) {
        if (qaContent.openAIFileId) {
          try {
            await removeFileFromVectorStore(knowledgeSource.vectorStoreId!, qaContent.openAIFileId);
            console.log(`Removed QA content file ${qaContent.openAIFileId} from vector store`);
          } catch (error) {
            console.error(`Error removing QA content file ${qaContent.openAIFileId} from vector store:`, error);
          }
        }
      }

      // Delete the vector store itself
      try {
        await openai.vectorStores.del(knowledgeSource.vectorStoreId);
        console.log(`Deleted vector store ${knowledgeSource.vectorStoreId}`);
      } catch (error) {
        console.error(`Error deleting vector store ${knowledgeSource.vectorStoreId}:`, error);
      }
    }

    // Delete files from storage (Vercel Blob or Supabase)
    for (const file of knowledgeSource.files) {
      try {
        // Check if the file has storage provider and URL properties
        // @ts-ignore - Type might not include storageProvider and storageUrl properties yet
        const storageProvider = file.storageProvider;
        // @ts-ignore - Type might not include storageProvider and storageUrl properties yet
        const storageUrl = file.storageUrl;
        
        // If file is stored in Supabase
        if (storageProvider === 'supabase' && storageUrl) {
          // Extract the path from the storage URL
          const url = new URL(storageUrl);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
          
          if (pathMatch && pathMatch.length >= 3) {
            const bucket = pathMatch[1];
            const path = pathMatch[2];
            
            await deleteFromSupabase(path, bucket);
            console.log(`Deleted file from Supabase: ${path} (bucket: ${bucket})`);
          } else {
            console.warn(`Could not extract path from Supabase URL: ${storageUrl}`);
          }
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

    // Delete all files from the database
    await db.file.deleteMany({
      where: { knowledgeSourceId: params.sourceId }
    });
    console.log(`Deleted all files for source ${params.sourceId}`);

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