import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ugnyocjdcpdlneirkfiq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbnlvY2pkY3BkbG5laXJrZmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxODMyNzA2MiwiZXhwIjoyMDMzOTAzMDYyfQ.e8POtKtNUPcnANuKKzlccIZSxP-TNz-lvmHKkodzpF0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicateJobs() {
  console.log('🧹 Cleaning up duplicate embedding jobs...\n');

  try {
    // First, show current state
    console.log('📊 Current embedding jobs:');
    const { data: allJobs, error: allJobsError } = await supabase
      .from('embedding_jobs')
      .select('job_id, content_type, content_id, status, knowledge_source_id, created_at')
      .order('content_id')
      .order('created_at');

    if (allJobsError) {
      console.error('❌ Error fetching jobs:', allJobsError);
      return;
    }

    if (!allJobs || allJobs.length === 0) {
      console.log('No jobs found');
      return;
    }

    // Group jobs by content_id to find duplicates
    const jobsByContent = allJobs.reduce((acc, job) => {
      const key = `${job.knowledge_source_id}-${job.content_id}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(job);
      return acc;
    }, {} as Record<string, any[]>);

    // Show current state
    Object.entries(jobsByContent).forEach(([key, jobs]) => {
      const [sourceId, contentId] = key.split('-');
      console.log(`\n📁 Content ${contentId} (Source: ${sourceId}):`);
      jobs.forEach(job => {
        console.log(`  • ${job.content_type} (${job.status}) - Created: ${new Date(job.created_at).toLocaleString()}`);
      });
    });

    // Find duplicates for the same content_id
    const duplicateGroups = Object.entries(jobsByContent).filter(([_, jobs]) => jobs.length > 1);

    if (duplicateGroups.length === 0) {
      console.log('\n✅ No duplicate jobs found!');
      return;
    }

    console.log(`\n🔍 Found ${duplicateGroups.length} content items with duplicate jobs:`);

    let totalDeleted = 0;

    for (const [key, jobs] of duplicateGroups) {
      const [sourceId, contentId] = key.split('-');
      console.log(`\n🔧 Processing duplicates for content ${contentId}:`);
      
      // Sort jobs by priority: completed > processing > pending, then by creation date (newest first)
      const sortedJobs = jobs.sort((a, b) => {
        const statusPriority = { completed: 1, processing: 2, pending: 3 };
        const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 4;
        const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 4;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // If same status, prefer newer jobs
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Keep the best job (first in sorted array)
      const jobToKeep = sortedJobs[0];
      const jobsToDelete = sortedJobs.slice(1);

      console.log(`  ✅ Keeping: ${jobToKeep.content_type} (${jobToKeep.status}) - ${new Date(jobToKeep.created_at).toLocaleString()}`);
      
      for (const jobToDelete of jobsToDelete) {
        console.log(`  🗑️ Deleting: ${jobToDelete.content_type} (${jobToDelete.status}) - ${new Date(jobToDelete.created_at).toLocaleString()}`);
        
        const { error: deleteError } = await supabase
          .from('embedding_jobs')
          .delete()
          .eq('job_id', jobToDelete.job_id);

        if (deleteError) {
          console.error(`    ❌ Error deleting job ${jobToDelete.job_id}:`, deleteError);
        } else {
          console.log(`    ✅ Deleted job ${jobToDelete.job_id}`);
          totalDeleted++;
        }
      }
    }

    console.log(`\n🎉 Cleanup complete! Deleted ${totalDeleted} duplicate jobs.`);

    // Show final state
    console.log('\n📊 Final embedding jobs state:');
    const { data: finalJobs, error: finalError } = await supabase
      .from('embedding_jobs')
      .select('content_type, status')
      .order('content_type')
      .order('status');

    if (finalError) {
      console.error('❌ Error fetching final state:', finalError);
    } else {
      const counts = finalJobs?.reduce((acc, job) => {
        const key = `${job.content_type}-${job.status}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      Object.entries(counts).forEach(([key, count]) => {
        const [contentType, status] = key.split('-');
        console.log(`  ${contentType} (${status}): ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupDuplicateJobs(); 