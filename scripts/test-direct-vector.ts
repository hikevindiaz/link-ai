/**
 * Direct test of vector embedding generation
 * This bypasses the API and tests the vector service directly
 */

import prisma from '@/lib/prisma';
import { processContent } from '@/lib/vector-service';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDirectVector() {
  console.log('🚀 Direct Vector Embedding Test\n');

  try {
    // 1. Find a user and knowledge source
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No users found. Please create a user account first.');
      return;
    }

    let knowledgeSource = await prisma.knowledgeSource.findFirst({
      where: { userId: user.id }
    });

    if (!knowledgeSource) {
      console.log('📚 Creating knowledge source...');
      knowledgeSource = await prisma.knowledgeSource.create({
        data: {
          name: 'Vector Test KB',
          description: 'Testing vector embeddings',
          userId: user.id
        }
      });
    }

    console.log('✅ Using knowledge source:', knowledgeSource.name);

    // 2. Add text content directly
    console.log('\n📝 Creating text content...');
    const textContent = await prisma.textContent.create({
      data: {
        content: 'LinkAI is transforming how businesses interact with customers through AI.',
        knowledgeSourceId: knowledgeSource.id
      }
    });
    console.log('✅ Created text content:', textContent.id);

    // 3. Process content for vectors
    console.log('\n🔄 Processing content for embeddings...');
    const vectorDocumentId = await processContent(
      knowledgeSource.id,
      textContent.id,
      'text',
      {
        content: textContent.content,
        metadata: { type: 'text', id: textContent.id }
      }
    );

    if (vectorDocumentId) {
      console.log('✅ Vector processing initiated! Document ID:', vectorDocumentId);
    } else {
      console.log('⚠️  Vector processing returned no ID');
    }

    // 4. Check embedding job status
    console.log('\n📋 Checking embedding job...');
    const { data: job, error: jobError } = await supabase
      .from('embedding_jobs')
      .select('*')
      .eq('content_id', textContent.id)
      .single();

    if (job) {
      console.log('✅ Embedding job found:');
      console.log('- Job ID:', job.job_id);
      console.log('- Status:', job.status);
      console.log('- Created:', new Date(job.created_at).toLocaleString());
    } else {
      console.log('❌ No embedding job found:', jobError?.message);
    }

    // 5. Trigger Edge Function to process the job
    console.log('\n🚀 Triggering Edge Function...');
    const { data: result, error: invokeError } = await supabase.functions.invoke('generate-embeddings');

    if (invokeError) {
      console.error('❌ Edge Function error:', invokeError);
    } else {
      console.log('✅ Edge Function response:', JSON.stringify(result, null, 2));
    }

    // 6. Check final results
    console.log('\n🔍 Checking final results...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing

    const { data: vectorDoc, error: vectorError } = await supabase
      .from('vector_documents')
      .select('*')
      .eq('content_id', textContent.id)
      .single();

    if (vectorDoc) {
      console.log('\n🎉 Success! Vector document created:');
      console.log('- Document ID:', vectorDoc.id);
      console.log('- Content type:', vectorDoc.content_type);
      console.log('- Model:', vectorDoc.metadata?.model);
      console.log('- Has embedding:', !!vectorDoc.embedding);
      
      // Check embedding quality
      if (vectorDoc.embedding) {
        const embedding = typeof vectorDoc.embedding === 'string' 
          ? JSON.parse(vectorDoc.embedding) 
          : vectorDoc.embedding;
        console.log('- Embedding dimensions:', Array.isArray(embedding) ? embedding.length : 'N/A');
        console.log('- Sample values:', Array.isArray(embedding) ? embedding.slice(0, 5) : 'N/A');
      }
    } else {
      console.log('❌ No vector document found:', vectorError?.message);
      
      // Check updated job status
      const { data: updatedJob } = await supabase
        .from('embedding_jobs')
        .select('*')
        .eq('content_id', textContent.id)
        .single();
        
      if (updatedJob) {
        console.log('\n📋 Updated job status:', updatedJob.status);
        if (updatedJob.error) {
          console.log('❌ Job error:', updatedJob.error);
        }
      }
    }

    console.log('\n✅ Test complete! Check the Vector Store tab in admin panel.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDirectVector(); 