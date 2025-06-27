import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { updateCatalogVector } from '@/lib/vector-service';
import { deleteProductImage, uploadToSupabase } from '@/lib/supabase';
import { createRollbackHandler } from '@/lib/rollback-system';

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

// Helper function to handle image upload
async function handleImageUpload(
  file: File,
  userId: string,
  rollback: any
): Promise<string | null> {
  try {
    // CHECKPOINT 1A: IMAGE UPLOAD
    console.log(`🖼️ CHECKPOINT 1A: Uploading product image...`);
    
    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image is too large. Maximum size is 5MB.');
    }

    const uploadResult = await uploadToSupabase(file, 'products', 'catalog', userId);
    
    if (!uploadResult) {
      throw new Error('Failed to upload image to storage');
    }

    // Record successful bucket upload for rollback
    rollback.recordBucketSuccess(uploadResult.url);
    console.log(`✅ CHECKPOINT 1A COMPLETE: Image uploaded to: ${uploadResult.url}`);
    
    return uploadResult.url;
  } catch (error) {
    console.error(`❌ CHECKPOINT 1A FAILED: Image upload failed`);
    throw error;
  }
}

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

    // Parse request - handle both multipart (with image) and JSON (without image)
    const contentType = request.headers.get('content-type') || '';
    let product: any;
    let catalogContentId: string | undefined;
    let imageFile: File | null = null;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with image)
      const formData = await request.formData();
      
      // Extract product data from form
      const productData = formData.get('product') as string;
      if (!productData) {
        return NextResponse.json({ error: 'Product data is required' }, { status: 400 });
      }
      
      try {
        const parsedProduct = JSON.parse(productData);
        product = parsedProduct;
        catalogContentId = formData.get('catalogContentId') as string || undefined;
      } catch (parseError) {
        return NextResponse.json({ error: 'Invalid product data format' }, { status: 400 });
      }
      
      // Extract image file if present
      imageFile = formData.get('image') as File;
    } else {
      // Handle JSON request (without image or with existing image URL)
      const body = await request.json();
      const validatedBody = requestBodySchema.safeParse(body);
      
      if (!validatedBody.success) {
        return NextResponse.json({ 
          error: 'Invalid request body', 
          details: validatedBody.error.format() 
        }, { status: 400 });
      }
      
      product = validatedBody.data.product;
      catalogContentId = validatedBody.data.catalogContentId;
    }

    // Create rollback handler for product operations
    const rollback = createRollbackHandler('catalog-product');

    try {
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
      let isUpdate = false;
      
      // CHECKPOINT 1A: IMAGE UPLOAD (if new image provided)
      if (imageFile) {
        const uploadedImageUrl = await handleImageUpload(imageFile, session.user.id, rollback);
        product.imageUrl = uploadedImageUrl; // Update product with uploaded image URL
      }
      
      // CHECKPOINT 1B: PRODUCT DATABASE OPERATIONS
      console.log(`💾 CHECKPOINT 1B: ${product.id ? 'Updating' : 'Creating'} product in database...`);
      
      // Update existing product or create a new one
      if (product.id) {
        isUpdate = true;
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

        // IMPORTANT: Delete old image BEFORE updating if image URL is changing
        // This prevents orphaned images in storage
        if (existingProduct.imageUrl && existingProduct.imageUrl !== product.imageUrl) {
          console.log(`Product image is being replaced, deleting old image FIRST: ${existingProduct.imageUrl}`);
          try {
            const deleted = await deleteProductImage(existingProduct.imageUrl);
            if (deleted) {
              console.log(`Successfully deleted old product image before update: ${existingProduct.imageUrl}`);
            } else {
              console.log(`Failed to delete old product image: ${existingProduct.imageUrl}`);
            }
          } catch (deleteError) {
            console.error('Error deleting old product image:', deleteError);
            // Log the error but continue with the update
          }
        }

        // Now update the product with the new data
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

        console.log(`Product ${product.id} updated successfully`);
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

      // Record successful database entry for rollback (products are part of catalog)
      rollback.recordDatabaseSuccess('catalog', catalogContent.id);
      
      console.log(`✅ CHECKPOINT 1B COMPLETE: Product ${isUpdate ? 'updated' : 'created'} with ID: ${result.id}`);

      // CHECKPOINT 2: VECTOR PROCESSING
      try {
        console.log(`🧠 CHECKPOINT 2: Processing vectors for catalog content...`);
        
        // Update the vector store with the latest product information
        await updateCatalogVector(sourceId, catalogContent.id);
        
        // Record successful vector processing for rollback
        rollback.recordVectorSuccess(sourceId, catalogContent.id, 'catalog');
        console.log(`✅ CHECKPOINT 2 COMPLETE: Updated vector store for catalog content ${catalogContent.id}`);

      } catch (vectorError) {
        console.error(`❌ CHECKPOINT 2 FAILED: Vector processing failed`);
        
        // EXECUTE ROLLBACK
        await rollback.executeRollback(`Vector processing failed: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
        
        throw new Error(`Product processing failed at vector stage. All changes have been rolled back. Error: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
      }

      // ALL CHECKPOINTS SUCCESSFUL
      rollback.clear();
      console.log(`🎉 ALL CHECKPOINTS COMPLETE: Product operation successful`);

      return NextResponse.json({ 
        success: true, 
        product: result 
      });
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Execute rollback for any partial operations
      await rollback.executeRollback(error instanceof Error ? error.message : 'Unknown error');
      
      return NextResponse.json({ error: 'Failed to save product' }, { status: 500 });
    }
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
      await updateCatalogVector(sourceId, catalogContentId);
      
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