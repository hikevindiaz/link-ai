import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { put } from '@vercel/blob';
import { processContentToVectorStore, updateCatalogContentVector } from '@/lib/knowledge-vector-integration';

// Schema for route parameters
const routeParamsSchema = z.object({
  sourceId: z.string(),
});

// GET handler to fetch catalog content
export async function GET(
  request: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    // Validate user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate route parameters
    const routeParams = routeParamsSchema.safeParse(params);
    if (!routeParams.success) {
      return NextResponse.json({ error: 'Invalid route parameters' }, { status: 400 });
    }

    const { sourceId } = routeParams.data;

    // Verify the knowledge source exists and belongs to the user
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        userId: session.user.id,
      },
    });

    if (!knowledgeSource) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    // Fetch catalog content
    const catalogContent = await db.catalogContent.findFirst({
      where: {
        knowledgeSourceId: sourceId,
      },
      include: {
        file: true,
        products: true,
      },
    });

    return NextResponse.json(catalogContent);
  } catch (error) {
    console.error('Error fetching catalog content:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog content' }, { status: 500 });
  }
}

// POST handler to upload a catalog file
export async function POST(
  request: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    // Validate user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate route parameters
    const routeParams = routeParamsSchema.safeParse(params);
    if (!routeParams.success) {
      return NextResponse.json({ error: 'Invalid route parameters' }, { status: 400 });
    }

    const { sourceId } = routeParams.data;

    // Verify the knowledge source exists and belongs to the user
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        userId: session.user.id,
      },
    });

    if (!knowledgeSource) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    // Parse input data - Only handle JSON now since file uploads are disabled
    let instructions;
    
    try {
      const jsonBody = await request.json();
      instructions = jsonBody.instructions;
      
      // Handle catalogMode from the request - for initialization
      if (jsonBody.catalogMode) {
        // Update the knowledge source with the catalog mode (only 'manual' is valid now)
        await db.knowledgeSource.update({
          where: { id: sourceId },
          data: { catalogMode: 'manual' }
        });
      }
    } catch (jsonError) {
      console.error('Error parsing JSON request:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
    }

    // Check if catalog content already exists
    const existingCatalogContent = await db.catalogContent.findFirst({
      where: {
        knowledgeSourceId: sourceId,
      },
    });

    // Create or update catalog content
    let catalogContent;

    if (existingCatalogContent) {
      // Update existing catalog content
      catalogContent = await db.catalogContent.update({
        where: { id: existingCatalogContent.id },
        data: {
          instructions: instructions,
        },
        include: {
          products: true,
        },
      });
    } else {
      // Create new catalog content
      catalogContent = await db.catalogContent.create({
        data: {
          knowledgeSourceId: sourceId,
          instructions: instructions,
        },
        include: {
          products: true,
        },
      });
    }

    // Send the updated content to the vector store
    if (catalogContent) {
      updateCatalogContentVector(sourceId, catalogContent.id)
        .then(openAIFileId => {
          console.log(`Successfully updated catalog content in vector store: ${openAIFileId}`);
        })
        .catch(error => {
          console.error('Error updating catalog content in vector store:', error);
        });
    }

    return NextResponse.json(catalogContent);
  } catch (error) {
    console.error('Error creating catalog content:', error);
    return NextResponse.json({ error: 'Failed to create catalog content' }, { status: 500 });
  }
}

// DELETE handler to remove all catalog content
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    // Validate user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate route parameters
    const routeParams = routeParamsSchema.safeParse(params);
    if (!routeParams.success) {
      return NextResponse.json({ error: 'Invalid route parameters' }, { status: 400 });
    }

    const { sourceId } = routeParams.data;
    
    // Check if this is a file-specific delete request (keep for backward compatibility)
    const url = new URL(request.url);
    const deleteFileOnly = url.searchParams.get('deleteFile') === 'true';

    // Verify the knowledge source exists and belongs to the user
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        userId: session.user.id,
      },
      select: {
        id: true,
        vectorStoreId: true
      }
    });

    if (!knowledgeSource) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    // If this is a file-only delete request, return a deprecated message
    if (deleteFileOnly) {
      return NextResponse.json({ 
        success: false,
        message: 'Document uploads have been disabled in this version'
      }, { status: 410 });
    }

    // Get catalog content before deletion to handle vector store cleanup
    const catalogContentIds = await db.catalogContent.findMany({
      where: {
        knowledgeSourceId: sourceId
      },
      select: {
        id: true
      }
    });

    // If we have a vector store ID and catalog contents, clean up the vector store
    if (knowledgeSource.vectorStoreId && catalogContentIds.length > 0) {
      // Import necessary modules
      const { getOpenAIClient } = await import('@/lib/openai');
      const { removeFileFromVectorStore } = await import('@/lib/vector-store');
      const openai = getOpenAIClient();

      // Get openAIFileIds using SQL to bypass the type checking
      for (const content of catalogContentIds) {
        try {
          // Use a raw query to get the openAIFileId
          const result = await db.$queryRaw`
            SELECT "openAIFileId" FROM "catalog_contents" 
            WHERE id = ${content.id}
            AND "openAIFileId" IS NOT NULL
          `;

          // Check if we got a result with an openAIFileId
          if (Array.isArray(result) && result.length > 0 && result[0].openAIFileId) {
            const openAIFileId = result[0].openAIFileId as string;
            
            // Remove file from vector store
            try {
              await removeFileFromVectorStore(knowledgeSource.vectorStoreId, openAIFileId);
              console.log(`Removed file ${openAIFileId} from vector store ${knowledgeSource.vectorStoreId}`);
            } catch (removeError) {
              console.error(`Error removing file from vector store:`, removeError);
            }
            
            // Delete the file from OpenAI
            try {
              await openai.files.del(openAIFileId);
              console.log(`Deleted OpenAI file ${openAIFileId}`);
            } catch (deleteError) {
              console.error(`Error deleting OpenAI file ${openAIFileId}:`, deleteError);
            }
          }
        } catch (error) {
          console.error(`Error querying for openAIFileId:`, error);
          // Continue with deletion even if cleanup fails
        }
      }
    }

    // Delete all catalog content for this knowledge source
    await db.catalogContent.deleteMany({
      where: {
        knowledgeSourceId: sourceId
      }
    });

    // Update the vector store timestamp to indicate a change
    await db.knowledgeSource.update({
      where: { id: sourceId },
      data: { 
        vectorStoreUpdatedAt: new Date(),
        catalogMode: null // Reset the catalog mode to allow selecting a new one
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'All catalog content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting catalog content:', error);
    return NextResponse.json({ error: 'Failed to delete catalog content' }, { status: 500 });
  }
} 