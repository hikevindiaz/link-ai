import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { processContentToVectorStore } from '@/lib/knowledge-vector-integration';

// Schema for route parameters
const routeParamsSchema = z.object({
  sourceId: z.string(),
  productId: z.string(),
});

// DELETE handler to delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sourceId: string; productId: string } }
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

    const { sourceId, productId } = routeParams.data;

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

    // Find the catalog content
    const catalogContent = await db.catalogContent.findFirst({
      where: {
        knowledgeSourceId: sourceId,
      },
    });

    if (!catalogContent) {
      return NextResponse.json({ error: 'Catalog content not found' }, { status: 404 });
    }

    // Find the product
    const product = await db.product.findFirst({
      where: {
        id: productId,
        catalogContentId: catalogContent.id,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete the product
    await db.product.delete({
      where: {
        id: productId,
      },
    });

    // Update the vector store to reflect the catalog change
    try {
      // Get remaining products for this catalog content
      const remainingProducts = await db.product.findMany({
        where: {
          catalogContentId: catalogContent.id
        }
      });
      
      if (knowledgeSource.vectorStoreId) {
        console.log(`Updating vector store ${knowledgeSource.vectorStoreId} after deleting product ${productId}`);
        
        // Process to vector store with all remaining products
        await processContentToVectorStore(
          sourceId,
          {
            instructions: catalogContent.instructions || '',
            products: remainingProducts,
            file: null // No file in manual mode
          },
          'catalog',
          catalogContent.id
        );
        
        console.log(`Updated vector store after product ${productId} deletion with ${remainingProducts.length} remaining products`);
        
        // Update the knowledge source timestamp
        await db.knowledgeSource.update({
          where: { id: sourceId },
          data: { vectorStoreUpdatedAt: new Date() },
        });
      }
    } catch (vectorError) {
      console.error(`Error updating vector store after product deletion:`, vectorError);
      // Continue even if vector store processing fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
} 