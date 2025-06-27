const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugFileIssue() {
  try {
    console.log('🔍 Debugging file upload issue...\n');

    // 1. Check recent files
    console.log('1. Recent files in database:');
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('id, name, storageUrl, knowledgeSourceId, createdAt')
      .order('createdAt', { ascending: false })
      .limit(5);

    if (filesError) {
      console.error('❌ Error fetching files:', filesError);
    } else {
      files.forEach(file => {
        console.log(`  - ID: ${file.id}`);
        console.log(`  - Name: ${file.name}`);
        console.log(`  - Storage URL: ${file.storageUrl}`);
        console.log(`  - Knowledge Source: ${file.knowledgeSourceId}`);
        console.log(`  - Created: ${file.createdAt}`);
        console.log('');
      });
    }

    // 2. Check recent embedding jobs
    console.log('2. Recent embedding jobs:');
    const { data: jobs, error: jobsError } = await supabase
      .from('embedding_jobs')
      .select('job_id, content_type, content_id, status, error, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobsError) {
      console.error('❌ Error fetching jobs:', jobsError);
    } else {
      jobs.forEach(job => {
        console.log(`  - Job ID: ${job.job_id}`);
        console.log(`  - Content Type: ${job.content_type}`);
        console.log(`  - Content ID: ${job.content_id}`);
        console.log(`  - Status: ${job.status}`);
        console.log(`  - Error: ${job.error || 'None'}`);
        console.log(`  - Created: ${job.created_at}`);
        console.log('');
      });
    }

    // 3. Check for the specific failing content_id
    const failingContentId = 'cmcdqy6q8000quvslsnnrth8r'; // From your error
    console.log(`3. Looking for specific content_id: ${failingContentId}`);
    
    const { data: specificFile, error: specificError } = await supabase
      .from('files')
      .select('*')
      .eq('id', failingContentId)
      .single();

    if (specificError) {
      console.log(`❌ File not found with ID ${failingContentId}: ${specificError.message}`);
      
      // Check if it's in any other table
      const { data: textContent } = await supabase
        .from('text_contents')
        .select('*')
        .eq('id', failingContentId)
        .single();
        
      if (textContent) {
        console.log(`✅ Found in text_contents table instead!`);
        console.log(`  - Content: ${textContent.content.substring(0, 100)}...`);
      }
    } else {
      console.log(`✅ Found file: ${specificFile.name}`);
      console.log(`  - Storage URL: ${specificFile.storageUrl}`);
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugFileIssue(); 