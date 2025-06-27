import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string; 

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  console.error('WARNING: Missing SUPABASE_SERVICE_ROLE_KEY environment variable. File operations may fail.');
}

export const supabasePublicClient = createClient(supabaseUrl, supabaseAnonKey);

// Service client with higher privileges (for server-side operations)
// This client needs the service role key to perform storage operations
export const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Export the Supabase client directly for debugging if needed
export { supabaseServiceClient as supabase };

// List of buckets we need to ensure exist
const REQUIRED_BUCKETS = ['files', 'products', 'exports', 'avatars'];

// Ensure required buckets exist
export async function ensureRequiredBuckets(): Promise<void> {
  try {
    // Get list of existing buckets
    const { data: buckets, error } = await supabaseServiceClient.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }
    
    const existingBucketNames = buckets.map(bucket => bucket.name);
    
    // Create any missing buckets
    for (const bucketName of REQUIRED_BUCKETS) {
      if (!existingBucketNames.includes(bucketName)) {
        const { error: createError } = await supabaseServiceClient.storage.createBucket(bucketName, {
          public: true, // Public access - this is essential for public file URLs
        });
        
        if (createError) {
          console.error(`Error creating bucket ${bucketName}:`, createError);
        } else {
          console.log(`Created bucket: ${bucketName}`);
        }
      }
    }
  } catch (error) {
    console.error('Error ensuring buckets exist:', error);
  }
}

// Upload file to Supabase storage
export async function uploadToSupabase(
  file: File | Blob, 
  bucket: string = 'products', 
  folder: string = '',
  userId: string,
  fileName?: string
): Promise<{ url: string; path: string } | null> {
  try {
    // Generate a unique file name
    const timestamp = Date.now();
    let fileExt = 'jpg'; // Default extension
    
    // Extract extension from File object or provided fileName
    if (file instanceof File && file.name) {
      fileExt = file.name.split('.').pop() || fileExt;
    } else if (fileName) {
      fileExt = fileName.split('.').pop() || fileExt;
    }
    
    const uniqueFileName = `${userId}_${timestamp}.${fileExt}`;
    
    // Create full path with folder if provided
    const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
    
    // Upload the file
    const { data, error } = await supabaseServiceClient.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return null;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabaseServiceClient.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    return null;
  }
}

/**
 * Delete a file from Supabase storage
 * @param url The URL of the file to delete (can be full URL or just the path)
 * @param bucket The storage bucket name
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteFromSupabase(url: string, bucket: string): Promise<boolean> {
  try {
    if (!url) {
      console.log('[deleteFromSupabase] No URL provided, skipping deletion');
      return true;
    }

    console.log(`[deleteFromSupabase] Starting deletion process for URL: ${url}`);
    console.log(`[deleteFromSupabase] Target bucket: ${bucket}`);

    // Extract the path from the URL
    let path = url;
    
    // Handle full Supabase storage URLs
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      // Example URL: https://[project].supabase.co/storage/v1/object/public/products/catalog/[userId]_[timestamp].jpg
      const match = url.match(/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
      if (match) {
        const urlBucket = match[1];
        path = match[2];
        
        console.log(`[deleteFromSupabase] Extracted from URL - Bucket: ${urlBucket}, Path: ${path}`);
        
        // Verify bucket matches
        if (urlBucket !== bucket) {
          console.warn(`[deleteFromSupabase] WARNING: URL bucket '${urlBucket}' doesn't match provided bucket '${bucket}'`);
        }
      } else {
        console.error(`[deleteFromSupabase] Failed to parse Supabase URL: ${url}`);
        return false;
      }
    }

    console.log(`[deleteFromSupabase] Attempting to delete - Bucket: ${bucket}, Path: ${path}`);

    // First, check if the file exists
    const { data: fileList, error: listError } = await supabaseServiceClient.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 100,
        search: path.split('/').pop()
      });

    if (listError) {
      console.error(`[deleteFromSupabase] Error listing files:`, listError);
    } else {
      console.log(`[deleteFromSupabase] Files found in directory:`, fileList?.length || 0);
    }

    // Attempt to delete the file
    const { data, error } = await supabaseServiceClient.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('[deleteFromSupabase] Supabase API error:', {
        error,
        bucket,
        path,
        fullUrl: url
      });
      return false;
    }

    console.log('[deleteFromSupabase] ✓ File deleted successfully:', {
      data,
      bucket,
      path
    });
    return true;
  } catch (error) {
    console.error('[deleteFromSupabase] Unexpected error:', error);
    return false;
  }
}

/**
 * Delete a product image from Supabase storage with retry logic
 * This is specifically for product images that may have RLS policies
 * @param imageUrl The full URL of the product image
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  if (!imageUrl) {
    console.log('[deleteProductImage] No image URL provided');
    return true;
  }

  console.log(`[deleteProductImage] Attempting to delete image: ${imageUrl}`);

  // First try with the products bucket
  let result = await deleteFromSupabase(imageUrl, 'products');
  
  if (!result) {
    // If that fails, check if it might be in the files bucket (legacy)
    console.log('[deleteProductImage] Failed with products bucket, trying files bucket');
    result = await deleteFromSupabase(imageUrl, 'files');
  }

  if (!result) {
    // Last resort: try to parse the URL differently
    console.log('[deleteProductImage] Standard deletion failed, trying alternative parsing');
    
    // Try extracting just the filename and searching for it
    const filename = imageUrl.split('/').pop();
    if (filename) {
      const { data: searchResults, error: searchError } = await supabaseServiceClient.storage
        .from('products')
        .list('catalog', {
          search: filename,
          limit: 1
        });

      if (searchResults && searchResults.length > 0) {
        const filePath = `catalog/${searchResults[0].name}`;
        console.log(`[deleteProductImage] Found file at: ${filePath}`);
        
        const { error } = await supabaseServiceClient.storage
          .from('products')
          .remove([filePath]);

        if (!error) {
          console.log('[deleteProductImage] ✓ Successfully deleted using search method');
          return true;
        } else {
          console.error('[deleteProductImage] Final deletion attempt failed:', error);
        }
      }
    }
  }

  return result;
}

// Function to convert from Vercel blob to Supabase storage
export async function migrateFileToSupabase(
  blobUrl: string,
  bucket: string = 'files',
  folder: string = '',
  userId: string,
  fileName?: string
): Promise<{ url: string; path: string } | null> {
  try {
    // Fetch the file from the Vercel blob URL
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from blob: ${response.statusText}`);
    }
    
    // Get the blob content
    const fileBlob = await response.blob();
    
    // If no fileName is provided, try to extract it from the URL
    if (!fileName) {
      const urlPath = new URL(blobUrl).pathname;
      fileName = urlPath.split('/').pop() || 'unknown';
    }
    
    // Upload to Supabase
    return await uploadToSupabase(fileBlob, bucket, folder, userId, fileName);
  } catch (error) {
    console.error('Error migrating file to Supabase:', error);
    return null;
  }
} 