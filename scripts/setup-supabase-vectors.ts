import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function setupSupabaseVectors() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Setting up Supabase vector store infrastructure...');

    // Read the SQL migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20240120_vector_store_setup.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));

      const { error } = await supabase.rpc('exec_sql', { 
        query: statement + ';' 
      }).single();

      if (error) {
        // Check if it's an "already exists" error which we can safely ignore
        if (error.message?.includes('already exists')) {
          console.log('✓ Already exists (skipping)');
        } else {
          console.error(`✗ Error: ${error.message}`);
          // Continue with other statements
        }
      } else {
        console.log('✓ Success');
      }
    }

    console.log('\n✅ Supabase vector store setup complete!');
  } catch (error) {
    console.error('Error setting up Supabase vectors:', error);
    process.exit(1);
  }
}

// Run the setup
setupSupabaseVectors(); 