/**
 * Script to apply the process_storage_document function migration
 * This creates the necessary database function for processing documents
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔧 Applying process_storage_document migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250125_create_process_documents_function.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Found migration file');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(/;(?=\s*(?:CREATE|GRANT|COMMENT|$))/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const firstLine = statement.split('\n')[0];
      console.log(`${i + 1}. Executing: ${firstLine}...`);
      
      const { error } = await supabase.rpc('query', {
        query: statement + ';'
      }).single();
      
      if (error) {
        // Try direct execution if rpc query fails
        const { error: directError } = await supabase.from('_dummy_').select().limit(0);
        
        // Use raw SQL execution via fetch
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({ query: statement + ';' })
        });
        
        if (!response.ok) {
          console.error(`   ❌ Failed: ${error?.message || 'Unknown error'}`);
          
          // For this specific migration, we'll execute it via a different approach
          console.log('   🔄 Trying alternative approach...');
          
          // Create a temporary function to execute our SQL
          const execSql = `
            DO $$
            BEGIN
              ${statement};
            END $$;
          `;
          
          const { error: doError } = await supabase.rpc('exec_sql', { sql: execSql });
          
          if (doError) {
            console.error(`   ❌ Alternative approach also failed: ${doError.message}`);
            throw new Error(`Failed to execute statement: ${firstLine}`);
          }
        }
      }
      
      console.log('   ✅ Success');
    }
    
    console.log('\n🎉 Migration applied successfully!');
    
    // Verify the function exists
    console.log('\n🔍 Verifying function exists...');
    const { data, error } = await supabase.rpc('verify_import_documents_setup');
    
    if (error) {
      console.log('❌ Could not verify function (this might be normal)');
    } else {
      console.log('✅ Verification result:', data);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 You may need to run this SQL manually in the Supabase SQL editor:');
    console.error('   1. Go to your Supabase dashboard');
    console.error('   2. Navigate to SQL Editor');
    console.error('   3. Copy and paste the contents of:');
    console.error('      supabase/migrations/20250125_create_process_documents_function.sql');
    console.error('   4. Run the query');
    process.exit(1);
  }
}

// Run the migration
applyMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 