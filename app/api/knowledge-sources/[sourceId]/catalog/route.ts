import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

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

    try {
      // Check if catalog content already exists
      const existingCatalogContent = await db.catalogContent.findFirst({
        where: {
          knowledgeSourceId: sourceId,
        },
      });

      // SIMPLE DATABASE OPERATION - No vectorization needed for instructions
      console.log(`💾 Saving catalog instructions to database...`);
      let catalogContent;

      if (existingCatalogContent) {
        // Update existing catalog content
        catalogContent = await db.catalogContent.update({
          where: { id: existingCatalogContent.id },
          data: {
            instructions: instructions || '', // Ensure empty string instead of undefined
          },
          include: {
            products: true,
          },
        });
        console.log(`✅ Updated catalog instructions for knowledge source ${sourceId}`);
      } else {
        // Create new catalog content
        catalogContent = await db.catalogContent.create({
          data: {
            knowledgeSourceId: sourceId,
            instructions: instructions || '', // Ensure empty string instead of undefined
          },
          include: {
            products: true,
          },
        });
        console.log(`✅ Created new catalog instructions for knowledge source ${sourceId}`);
      }

      return NextResponse.json(catalogContent);
    } catch (error) {
      console.error('Error saving catalog instructions:', error);
      return NextResponse.json({ error: 'Failed to save catalog instructions' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
        id: true
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

    // Clean up vector store for all catalog contents
    if (catalogContentIds.length > 0) {
      const { deleteContent } = await import('@/lib/vector-service');

      for (const content of catalogContentIds) {
        try {
            // Remove from vector store using new service
              await deleteContent(sourceId, 'catalog', content.id);
              console.log(`Removed catalog content ${content.id} from vector store`);
            } catch (removeError) {
              console.error(`Error removing catalog content from vector store:`, removeError);
          // Continue with deletion even if vector store cleanup fails
        }
      }
    }

    // Delete all catalog content for this knowledge source
    await db.catalogContent.deleteMany({
      where: {
        knowledgeSourceId: sourceId
      }
    });

    // Reset the catalog mode to allow selecting a new one
    await db.knowledgeSource.update({
      where: { id: sourceId },
      data: { 
        catalogMode: null
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