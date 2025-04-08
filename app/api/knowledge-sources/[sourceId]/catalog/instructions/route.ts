import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { updateCatalogContentVector } from '@/lib/knowledge-vector-integration';

// Schema for route parameters
const routeParamsSchema = z.object({
  sourceId: z.string(),
});

// PATCH handler to update catalog instructions
export async function PATCH(
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

    // Parse the request body
    const body = await request.json();
    const instructions = body.instructions;

    // Find existing catalog content
    let catalogContent = await db.catalogContent.findFirst({
      where: {
        knowledgeSourceId: sourceId,
      },
      include: {
        file: true,
        products: true,
      },
    });

    // Create catalog content if it doesn't exist
    if (!catalogContent) {
      catalogContent = await db.catalogContent.create({
        data: {
          knowledgeSourceId: sourceId,
          instructions: instructions || undefined,
        },
        include: {
          file: true,
          products: true,
        },
      });
    } 
    // Update existing catalog content
    else {
      catalogContent = await db.catalogContent.update({
        where: {
          id: catalogContent.id,
        },
        data: {
          instructions: instructions || undefined,
        },
        include: {
          file: true,
          products: true,
        },
      });
    }

    // Process content to vector store if we have a file or products
    if ((catalogContent.file || catalogContent.products.length > 0) && knowledgeSource.vectorStoreId) {
      try {
        await updateCatalogContentVector(sourceId, catalogContent.id);
        console.log(`Updated vector store for catalog content ${catalogContent.id} with new instructions`);
      } catch (vectorError) {
        console.error(`Error updating vector store:`, vectorError);
        // Continue even if vector store processing fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Instructions updated successfully',
      catalogContent
    });
  } catch (error) {
    console.error('Error updating catalog instructions:', error);
    return NextResponse.json({ error: 'Failed to save instructions' }, { status: 500 });
  }
} 