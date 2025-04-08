// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Check required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required Supabase environment variables');
  process.exit(1);
}

if (!process.env.POSTGRES_PRISMA_URL) {
  console.error('Missing current database connection string');
  process.exit(1);
}

// Initialize Prisma client for current database
const prisma = new PrismaClient();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public',
  }
});

async function migrateDatabase() {
  console.log('Starting database migration to Supabase...');
  
  try {
    // Get all models from Prisma schema
    // Here we'll list each model we want to migrate
    const models = [
      'User',
      'OpenAIConfig',
      'ChatbotFiles',
      'ChatbotMessagesExport',
      'ChatbotErrors',
      'Chatbot',
      'File',
      'ChatbotModel',
      'ClientInquiries',
      'Message',
      'ConversationSummary',
      'Crawler',
      'Account',
      'Session'
      // Add all other models here
    ];
    
    for (const model of models) {
      try {
        console.log(`Migrating ${model}...`);
        
        // Get data from current database
        // @ts-ignore - Dynamic access to Prisma models
        const data = await prisma[model.toLowerCase()].findMany();
        
        if (data.length === 0) {
          console.log(`No data found for ${model}, skipping...`);
          continue;
        }
        
        console.log(`Found ${data.length} records for ${model}`);
        
        // Prepare table name (convert from PascalCase to snake_case)
        const tableName = model
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .substring(1); // Remove leading underscore
        
        // Insert data into Supabase table in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          
          // Clean data for insertion (e.g., Date objects)
          const cleanedBatch = batch.map(item => {
            const cleaned = { ...item };
            
            // Convert Date objects to ISO strings
            Object.keys(cleaned).forEach(key => {
              if (cleaned[key] instanceof Date) {
                cleaned[key] = cleaned[key].toISOString();
              }
            });
            
            return cleaned;
          });
          
          // Insert data into Supabase
          const { error } = await supabase
            .from(tableName)
            .insert(cleanedBatch);
          
          if (error) {
            console.error(`Error inserting ${model} batch:`, error);
          } else {
            console.log(`Inserted batch ${i / BATCH_SIZE + 1} for ${model}`);
          }
        }
        
        console.log(`Completed migration for ${model}`);
      } catch (modelError) {
        console.error(`Error migrating ${model}:`, modelError);
      }
    }
    
    console.log('Database migration completed!');
  } catch (error) {
    console.error('Error during database migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateDatabase()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  }); 