// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import { ensureRequiredBuckets, migrateFileToSupabase } from '../lib/supabase';
import { PrismaClient } from '@prisma/client';

// Verify environment variables are loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required Supabase environment variables. Make sure your .env file is complete.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function migrateFilesToSupabase() {
  console.log('Starting migration of files from Vercel blob to Supabase storage...');
  
  try {
    // Ensure the required buckets exist in Supabase
    await ensureRequiredBuckets();
    console.log('Required buckets checked/created.');
    
    // Get all files that are using Vercel blob storage
    const files = await prisma.file.findMany({
      where: {
        // @ts-ignore - storageProvider exists in the schema but TypeScript doesn't recognize it
        storageProvider: 'vercel',
        blobUrl: {
          not: ''
        }
      },
      include: {
        user: true
      }
    });
    
    console.log(`Found ${files.length} files to migrate`);
    
    // Migrate each file
    for (const [index, file] of files.entries()) {
      console.log(`Processing file ${index + 1}/${files.length}: ${file.name}`);
      
      try {
        // Skip if already migrated
        // @ts-ignore - storageUrl exists in the schema but TypeScript doesn't recognize it
        if (file.storageUrl) {
          console.log(`  File already has storageUrl, skipping: ${file.name}`);
          continue;
        }
        
        // Determine bucket based on file usage
        let bucket = 'files';
        let folder = '';
        
        // Upload to Supabase
        const result = await migrateFileToSupabase(
          file.blobUrl,
          bucket,
          folder,
          file.userId,
          file.name
        );
        
        if (result) {
          // Update the record in the database
          await prisma.file.update({
            where: { id: file.id },
            data: {
              // @ts-ignore - storageUrl and storageProvider exist in the schema but TypeScript doesn't recognize them
              storageUrl: result.url,
              storageProvider: 'supabase'
            }
          });
          
          console.log(`  Successfully migrated ${file.name} to Supabase`);
        } else {
          console.error(`  Failed to migrate ${file.name}`);
        }
      } catch (fileError) {
        console.error(`  Error migrating file ${file.name}:`, fileError);
      }
    }
    
    console.log('File migration complete!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateFilesToSupabase()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  }); 