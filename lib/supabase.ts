import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string; 

export const supabasePublicClient = createClient(supabaseUrl, supabaseAnonKey);

// Service client with higher privileges (for server-side operations)
export const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey);

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

// Delete file from Supabase storage
export async function deleteFromSupabase(path: string, bucket: string = 'products'): Promise<boolean> {
  try {
    const { error } = await supabaseServiceClient.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Supabase storage delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    return false;
  }
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