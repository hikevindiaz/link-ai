import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ugnyocjdcpdlneirkfiq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbnlvY2pkY3BkbG5laXJrZmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxODMyNzA2MiwiZXhwIjoyMDMzOTAzMDYyfQ.e8POtKtNUPcnANuKKzlccIZSxP-TNz-lvmHKkodzpF0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFileDeletionCleanup() {
  console.log('🧪 Testing file deletion cleanup...\n');

  try {
    // Check current state
    console.log('📊 Current vector documents:');
    const { data: vectorDocs, error: vectorError } = await supabase
      .from('vector_documents')
      .select('content_type, content_id, knowledge_source_id')
      .order('content_type')
      .order('content_id');

    if (vectorError) {
      console.error('❌ Error fetching vector documents:', vectorError);
    } else {
      const counts = vectorDocs?.reduce((acc, doc) => {
        acc[doc.content_type] = (acc[doc.content_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      Object.entries(counts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} documents`);
      });

      // Show specific text-type documents that might be from files
      const textDocs = vectorDocs?.filter(doc => doc.content_type === 'text') || [];
      if (textDocs.length > 0) {
        console.log('\n📝 Text-type vector documents (these might be from files):');
        textDocs.forEach(doc => {
          console.log(`  • Content ID: ${doc.content_id} (Source: ${doc.knowledge_source_id})`);
        });
      }
    }

    // Check current files
    console.log('\n📁 Current files in database:');
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('id, name, "knowledgeSourceId"')
      .order('name');

    if (filesError) {
      console.error('❌ Error fetching files:', filesError);
    } else {
      if (files && files.length > 0) {
        files.forEach(file => {
          console.log(`  • ${file.name} (ID: ${file.id}, Source: ${file.knowledgeSourceId})`);
        });
      } else {
        console.log('  No files found in database');
      }
    }

    // Check for orphaned vector documents (text-type with content_id that matches file IDs)
    console.log('\n🔍 Checking for potential orphaned vector documents...');
    if (vectorDocs && files) {
      const fileIds = files.map(f => f.id);
      const textVectorDocs = vectorDocs.filter(doc => doc.content_type === 'text');
      const potentialOrphans = textVectorDocs.filter(doc => 
        fileIds.includes(doc.content_id) || 
        !fileIds.includes(doc.content_id)
      );

      if (potentialOrphans.length > 0) {
        console.log('Found text-type vector documents:');
        potentialOrphans.forEach(doc => {
          const hasMatchingFile = fileIds.includes(doc.content_id);
          console.log(`  • Content ID: ${doc.content_id} ${hasMatchingFile ? '✅ (has matching file)' : '⚠️ (no matching file - might be orphaned)'}`);
        });
      } else {
        console.log('No potential orphans found');
      }
    }

    // Check embedding jobs
    console.log('\n⚙️ Current embedding jobs:');
    const { data: jobs, error: jobsError } = await supabase
      .from('embedding_jobs')
      .select('content_type, content_id, status, knowledge_source_id')
      .order('content_type')
      .order('status');

    if (jobsError) {
      console.error('❌ Error fetching embedding jobs:', jobsError);
    } else {
      const jobCounts = jobs?.reduce((acc, job) => {
        const key = `${job.content_type}-${job.status}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      Object.entries(jobCounts).forEach(([key, count]) => {
        const [contentType, status] = key.split('-');
        console.log(`  ${contentType} (${status}): ${count}`);
      });
    }

    console.log('\n✅ File deletion cleanup test completed!');
    console.log('\n💡 To test the fix:');
    console.log('1. Upload a file through the UI');
    console.log('2. Verify it creates a text-type vector document');
    console.log('3. Delete the file through the UI');
    console.log('4. Run this script again to verify the vector document is cleaned up');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testFileDeletionCleanup(); 