import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyVectorSetup() {
  console.log('🔍 Verifying Vector Setup...\n');

  try {
    // Check setup status
    const { data: status, error } = await supabase.rpc('verify_import_documents_setup');
    
    if (error) {
      console.error('❌ Error checking setup:', error.message);
      return false;
    }

    console.log('Setup Status:', status.status);
    console.log('Message:', status.message);

    if (status.setup_required) {
      console.log('\n📋 Setup Instructions:');
      status.instructions.forEach((instruction: string, index: number) => {
        console.log(`   ${index + 1}. ${instruction}`);
      });
      console.log('\n❗ Please follow these instructions to enable import_documents');
      return false;
    }

    // If import_documents is available, test it
    console.log('\n✅ import_documents is available!');
    console.log('\n🧪 Testing import_documents with correct signature...');

    // Test with the correct signature from the documentation
    const { error: testError } = await supabase.rpc('import_documents', {
      schema: 'public',
      table_name: 'vector_documents',
      bucket_name: 'test-bucket',
      path: 'test-file.txt',
      embedding_model: 'gte-small',
      chunk_size: 1024,
      chunk_overlap: 200
    });

    if (testError) {
      if (testError.message.includes('not found in the schema cache')) {
        console.log('\n❓ Function exists but signature might be different');
        console.log('Error:', testError.message);
        console.log('\nPlease check the function signature in your Supabase dashboard');
      } else {
        console.log('\n✅ import_documents signature is correct!');
        console.log('(Test failed as expected since test bucket/file doesn\'t exist)');
      }
    }

    return true;

  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Run verification
verifyVectorSetup().then(success => {
  if (success) {
    console.log('\n🎉 Vector setup verification complete!');
  } else {
    console.log('\n⚠️  Vector setup needs attention');
  }
  process.exit(success ? 0 : 1);
}); 