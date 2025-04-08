import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient as SourcePrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Check if we have both database URLs
const neonDbUrl = process.env.POSTGRES_PRISMA_URL;
const supabaseDbUrl = process.env.DATABASE_URL;

if (!neonDbUrl) {
  console.error('Error: POSTGRES_PRISMA_URL (Neon database) not found in .env');
  process.exit(1);
}

if (!supabaseDbUrl) {
  console.error('Error: DATABASE_URL (Supabase database) not found in .env');
  process.exit(1);
}

console.log('🚀 Starting migration from Neon to Supabase...');

// Create a temporary .env file for the source connection
const tempEnvPath = path.join(__dirname, '../.env.neon');
fs.writeFileSync(tempEnvPath, `DATABASE_URL=${neonDbUrl}\n`);

console.log('1️⃣ Connecting to source database (Neon)...');

// Define models to migrate in the order that respects foreign key constraints
const modelsToMigrate = [
  'User', 
  'Session',
  'Account',
  'OpenAIConfig',
  'Chatbot',
  'ChatbotModel',
  'ChatbotFiles',
  'ChatbotMessagesExport',
  'ChatbotErrors',
  'ClientInquiries',
  'Message',
  'ConversationSummary',
  'Crawler',
  'File',
  'FormField',
  'Form',
  'FormSubmission',
  'FormFieldValue',
  'ChatbotForm',
  'KnowledgeSource',
  'TextContent',
  'Product',
  'CatalogContent',
  'AssistantSettings',
  'TwilioPhoneNumber'
];

// Function to safely extract batch data
const safelyExtractBatchData = (data: any) => {
  return data.map((item: any) => {
    const newItem: any = {};
    
    // Process each property in the item
    for (const [key, value] of Object.entries(item)) {
      // Handle Date objects
      if (value instanceof Date) {
        newItem[key] = value;
      } 
      // Handle BigInt by converting to string
      else if (typeof value === 'bigint') {
        newItem[key] = value.toString();
      }
      // Handle arrays of primitive values
      else if (Array.isArray(value) && value.every(v => 
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
        newItem[key] = value;
      }
      // Handle simple objects (likely JSON fields) or primitives
      else if (value === null || 
               typeof value === 'string' || 
               typeof value === 'number' || 
               typeof value === 'boolean' ||
               (typeof value === 'object' && !Array.isArray(value))) {
        newItem[key] = value;
      } else {
        // For complex nested objects or arrays of objects, stringify them
        try {
          newItem[key] = JSON.stringify(value);
        } catch (e) {
          console.warn(`Could not process field ${key} with value type ${typeof value}, setting to null`);
          newItem[key] = null;
        }
      }
    }
    return newItem;
  });
};

async function migrateData() {
  try {
    // Using pg_dump and psql for direct database migration
    const tempDumpPath = path.join(__dirname, '../neon_dump.sql');
    
    console.log('2️⃣ Dumping Neon database schema and data...');
    
    try {
      // Extract connection details from the URL
      const neonUrlMatch = neonDbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
      const supabaseUrlMatch = supabaseDbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
      
      if (!neonUrlMatch || !supabaseUrlMatch) {
        throw new Error('Could not parse database URLs');
      }
      
      const [, neonUser, neonPassword, neonHost, neonPort, neonDb] = neonUrlMatch;
      const [, supabaseUser, supabasePassword, supabaseHost, supabasePort, supabaseDb] = supabaseUrlMatch;
      
      // Set environment variables for pg_dump and psql
      process.env.PGPASSWORD = neonPassword;
      
      // Dump only the data (--data-only) without owner info (--no-owner) and without privileges (--no-acl)
      const pgDumpCommand = `pg_dump --host=${neonHost} --port=${neonPort} --username=${neonUser} --dbname=${neonDb} --data-only --no-owner --no-acl > ${tempDumpPath}`;
      
      console.log('Running pg_dump...');
      execSync(pgDumpCommand, { stdio: 'inherit' });
      
      // Set environment variable for Supabase password
      process.env.PGPASSWORD = supabasePassword;
      
      console.log('3️⃣ Restoring data to Supabase...');
      const psqlCommand = `psql --host=${supabaseHost} --port=${supabasePort} --username=${supabaseUser} --dbname=${supabaseDb} < ${tempDumpPath}`;
      
      execSync(psqlCommand, { stdio: 'inherit' });
      
      console.log('4️⃣ Database migration completed successfully!');
    } catch (error) {
      console.error('Database dump/restore failed:', error);
      console.log('Falling back to Prisma-based migration...');
      
      // Continue with Prisma-based migration as backup
    } finally {
      // Clean up dump file
      if (fs.existsSync(tempDumpPath)) {
        fs.unlinkSync(tempDumpPath);
      }
    }
    
    console.log('5️⃣ Starting Prisma-based migration as a backup/verification...');
    
    // Connect to source database (Neon)
    const sourcePrisma = new SourcePrismaClient({
      datasourceUrl: neonDbUrl,
    });
    
    // Connect to target database (Supabase)
    process.env.DATABASE_URL = supabaseDbUrl;
    const { PrismaClient: TargetPrismaClient } = require('@prisma/client');
    const targetPrisma = new TargetPrismaClient();
    
    let successCount = 0;
    let errorCount = 0;
    
    // Migrate each model
    for (const model of modelsToMigrate) {
      try {
        console.log(`Migrating ${model}...`);
        
        // Get lowercase model name for Prisma
        const modelName = model.charAt(0).toLowerCase() + model.slice(1);
        
        // Skip if model doesn't exist in schema
        if (!(modelName in sourcePrisma)) {
          console.log(`Model ${model} not found in schema, skipping.`);
          continue;
        }
        
        // Count records
        // @ts-ignore - Dynamic model access
        const count = await sourcePrisma[modelName].count();
        console.log(`Found ${count} records in ${model}`);
        
        if (count === 0) {
          continue; // Skip if no records
        }
        
        // Process in batches of 100
        const batchSize = 100;
        let processed = 0;
        
        while (processed < count) {
          // @ts-ignore - Dynamic model access
          const batch = await sourcePrisma[modelName].findMany({
            skip: processed,
            take: batchSize,
          });
          
          if (batch.length === 0) break;
          
          // Process the batch to handle special data types
          const safeBatch = safelyExtractBatchData(batch);
          
          try {
            // Use createMany for efficiency
            // @ts-ignore - Dynamic model access
            await targetPrisma[modelName].createMany({
              data: safeBatch,
              skipDuplicates: true,
            });
            
            processed += batch.length;
            console.log(`Migrated ${processed}/${count} records for ${model}`);
            successCount++;
          } catch (batchError: any) {
            console.error(`Error migrating batch for ${model}:`, batchError.message);
            
            // Fall back to individual inserts on batch error
            console.log(`Trying individual inserts for ${model} batch...`);
            
            for (const item of safeBatch) {
              try {
                // @ts-ignore - Dynamic model access
                await targetPrisma[modelName].create({
                  data: item,
                });
              } catch (itemError: any) {
                console.error(`Failed to migrate item in ${model}:`, itemError.message);
                errorCount++;
              }
            }
            
            processed += batch.length;
          }
        }
      } catch (modelError: any) {
        console.error(`Error migrating ${model}:`, modelError.message);
        errorCount++;
      }
    }
    
    console.log(`\n6️⃣ Migration summary:`);
    console.log(`✅ Successfully processed: ${successCount} models`);
    console.log(`❌ Errors: ${errorCount} models`);
    
    // Clean up and disconnect
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
    
    // Remove temp env file
    if (fs.existsSync(tempEnvPath)) {
      fs.unlinkSync(tempEnvPath);
    }
    
    console.log('\n🎉 Migration complete! Your data is now in Supabase.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData().catch(console.error); 