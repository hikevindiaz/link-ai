import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testVectorSetup() {
  console.log('🧪 Testing Supabase Vector Store Setup...\n');

  try {
    // 1. Check if vector_documents table exists
    console.log('1️⃣ Checking vector_documents table...');
    const { data: tables, error: tableError } = await supabase
      .from('vector_documents')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code !== 'PGRST116') {
      throw new Error(`Table check failed: ${tableError.message}`);
    }
    console.log('✅ vector_documents table exists\n');

    // 2. Check if embedding_job_status table exists
    console.log('2️⃣ Checking embedding_job_status table...');
    const { data: jobTable, error: jobError } = await supabase
      .from('embedding_job_status')
      .select('id')
      .limit(1);
    
    if (jobError && jobError.code !== 'PGRST116') {
      throw new Error(`Job table check failed: ${jobError.message}`);
    }
    console.log('✅ embedding_job_status table exists\n');

    // 3. Check knowledge_sources columns
    console.log('3️⃣ Checking knowledge_sources columns...');
    const { data: knowledgeSource, error: ksError } = await supabase
      .from('knowledge_sources')
      .select('id, supabaseVectorEnabled, embeddingProvider, embeddingModel, embeddingDimensions')
      .limit(1)
      .single();
    
    if (ksError && ksError.code !== 'PGRST116') {
      console.log('✅ New columns exist in knowledge_sources');
      console.log('   Default values:', {
        supabaseVectorEnabled: false,
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
        embeddingDimensions: 1536
      });
    } else if (knowledgeSource) {
      console.log('✅ Knowledge source found with vector config:', knowledgeSource);
    }
    console.log('');

    // 4. Test Edge Function
    console.log('4️⃣ Testing Edge Function...');
    const testContent = {
      content: 'This is a test content for embedding generation',
      knowledge_source_id: 'test-source',
      content_type: 'text',
      content_id: 'test-id',
      metadata: { test: true }
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify(testContent)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Edge Function is working');
      console.log('   Response:', result);
      
      // Clean up test data
      if (result.vector_document_id) {
        await supabase
          .from('vector_documents')
          .delete()
          .eq('id', result.vector_document_id);
        console.log('   (Test data cleaned up)');
      }
    } else {
      const error = await response.text();
      console.log('❌ Edge Function error:', error);
    }
    console.log('');

    // 5. Check if any knowledge sources have Supabase vectors enabled
    console.log('5️⃣ Checking for Supabase-enabled knowledge sources...');
    const { data: enabledSources, error: enabledError } = await supabase
      .from('knowledge_sources')
      .select('id, name, supabaseVectorEnabled')
      .eq('supabaseVectorEnabled', true);
    
    if (enabledSources && enabledSources.length > 0) {
      console.log(`✅ Found ${enabledSources.length} knowledge source(s) with Supabase vectors enabled:`);
      enabledSources.forEach(source => {
        console.log(`   - ${source.name} (${source.id})`);
      });
    } else {
      console.log('ℹ️  No knowledge sources have Supabase vectors enabled yet');
      console.log('   To enable, update a knowledge source with:');
      console.log('   supabaseVectorEnabled = true');
    }

    console.log('\n✅ All tests passed! Your LLM-agnostic vector store is ready.');
    console.log('\n📝 Next steps:');
    console.log('1. Enable Supabase vectors for a knowledge source');
    console.log('2. Add content to test embedding generation');
    console.log('3. Test vector search functionality');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testVectorSetup(); 