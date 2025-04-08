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

// Schema for product data
const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  price: z.number().min(0, "Price must be a positive number"),
  taxRate: z.number().min(0, "Tax rate must be a positive number"),
  description: z.string().optional(),
  categories: z.array(z.string()),
  imageUrl: z.string().optional(),
});

// Schema for request body
const requestBodySchema = z.object({
  knowledgeSourceId: z.string(),
  catalogContentId: z.string().optional(),
  product: productSchema,
});

// POST handler to create or update a product
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

    // Parse and validate the request body
    const body = await request.json();
    const validatedBody = requestBodySchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: validatedBody.error.format() 
      }, { status: 400 });
    }

    const { product, catalogContentId } = validatedBody.data;

    // Find or create catalog content
    let catalogContent;
    if (catalogContentId) {
      catalogContent = await db.catalogContent.findFirst({
        where: {
          id: catalogContentId,
          knowledgeSourceId: sourceId,
        },
      });

      if (!catalogContent) {
        return NextResponse.json({ error: 'Catalog content not found' }, { status: 404 });
      }
    } else {
      // Check if catalog content already exists
      catalogContent = await db.catalogContent.findFirst({
        where: {
          knowledgeSourceId: sourceId,
        },
      });

      // Create catalog content if it doesn't exist
      if (!catalogContent) {
        catalogContent = await db.catalogContent.create({
          data: {
            knowledgeSourceId: sourceId,
          },
        });
      }
    }

    let result;
    
    // Update existing product or create a new one
    if (product.id) {
      // Check if the product exists and belongs to this catalog content
      const existingProduct = await db.product.findFirst({
        where: {
          id: product.id,
          catalogContentId: catalogContent.id,
        },
      });

      if (!existingProduct) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Update the product
      result = await db.product.update({
        where: {
          id: product.id,
        },
        data: {
          title: product.title,
          price: product.price,
          taxRate: product.taxRate,
          description: product.description || "",
          categories: product.categories,
          imageUrl: product.imageUrl,
        },
      });
    } else {
      // Create a new product
      result = await db.product.create({
        data: {
          title: product.title,
          price: product.price,
          taxRate: product.taxRate,
          description: product.description || "",
          categories: product.categories,
          imageUrl: product.imageUrl,
          catalogContentId: catalogContent.id,
        },
      });
    }

    // Process the content to the vector store
    try {
      // Update the vector store with the latest product information
      await updateCatalogContentVector(sourceId, catalogContent.id);
      
      console.log(`Updated vector store for catalog content ${catalogContent.id} after product update`);
    } catch (vectorError) {
      console.error(`Error updating vector store:`, vectorError);
      // Continue even if vector store processing fails
    }

    return NextResponse.json({ 
      success: true, 
      product: result 
    });
  } catch (error) {
    console.error('Error saving product:', error);
    return NextResponse.json({ error: 'Failed to save product' }, { status: 500 });
  }
}

// DELETE handler for removing a product
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
    const { sourceId, productId } = params;
    if (!sourceId || !productId) {
      return NextResponse.json({ error: 'Invalid route parameters' }, { status: 400 });
    }

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

    // Find the product and verify it belongs to a catalog in this knowledge source
    const product = await db.product.findFirst({
      where: {
        id: productId,
        catalogContent: {
          knowledgeSourceId: sourceId,
        },
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

    // Update the vector store to reflect the deletion
    try {
      // Get the catalog content id
      const catalogContentId = product.catalogContentId;
      
      // Update vector store with current products (now excluding the deleted one)
      await updateCatalogContentVector(sourceId, catalogContentId);
      
      console.log(`Updated vector store for catalog content ${catalogContentId} after product deletion`);
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