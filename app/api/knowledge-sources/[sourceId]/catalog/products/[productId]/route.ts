import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { updateCatalogVector } from '@/lib/vector-service';
import { deleteProductImage } from '@/lib/supabase';

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

    // Delete the product image if it exists
    if (product.imageUrl) {
      console.log(`[Product Deletion] Step 1: Deleting product image from storage: ${product.imageUrl}`);
      try {
        const deleted = await deleteProductImage(product.imageUrl);
        if (deleted) {
          console.log(`[Product Deletion] ✓ Successfully deleted product image: ${product.imageUrl}`);
        } else {
          console.log(`[Product Deletion] ⚠️ Failed to delete product image: ${product.imageUrl}`);
        }
      } catch (deleteError) {
        console.error('[Product Deletion] ✗ Error deleting product image:', deleteError);
        // Continue with deletion even if image deletion fails
      }
    } else {
      console.log('[Product Deletion] No image to delete for this product');
    }

    // Delete the product from database
    console.log(`[Product Deletion] Step 2: Deleting product ${productId} from database`);
    await db.product.delete({
      where: {
        id: productId,
      },
    });
    console.log(`[Product Deletion] ✓ Successfully deleted product ${productId} from database`);

    // Update the vector store to reflect the catalog change
    console.log(`[Product Deletion] Step 3: Updating vector store for catalog`);
    try {
      console.log(`[Product Deletion] Updating vector store for catalog content ${catalogContent.id}`);
        
      // Update catalog vector with the remaining products
      // This will automatically handle the removal of the deleted product from vectors
      await updateCatalogVector(sourceId, catalogContent.id);
        
      console.log(`[Product Deletion] ✓ Successfully updated vector store after product deletion`);
    } catch (vectorError) {
      console.error(`[Product Deletion] ✗ Error updating vector store:`, vectorError);
      // Continue even if vector store processing fails
      // The product is already deleted from DB, so we don't want to fail the whole operation
    }

    console.log(`[Product Deletion] ✓ Product deletion completed successfully`);

    return NextResponse.json({ 
      success: true,
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
} 