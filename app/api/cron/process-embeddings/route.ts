import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting embedding job processing...');
    
    // First, try PGMQ approach
    let processedJobs = 0;
    let pgmqWorking = false;
    
    try {
      // Test PGMQ availability
      const { data: queueLength, error: queueError } = await supabase
        .rpc('pgmq_queue_length', { queue_name: 'embedding_queue' });
      
      if (!queueError && queueLength !== null) {
        pgmqWorking = true;
        console.log(`📊 PGMQ queue length: ${queueLength}`);
        
        // Process jobs from PGMQ
        const batchSize = 5;
        for (let i = 0; i < Math.min(batchSize, queueLength); i++) {
          try {
            // Read message from queue
            const { data: message, error: readError } = await supabase
              .rpc('pgmq_read', { 
                queue_name: 'embedding_queue',
                vt: 30 // 30 second visibility timeout
              });
            
            if (readError || !message) {
              console.log('No more messages in PGMQ queue');
              break;
            }
            
            const jobId = message.message;
            console.log(`🎯 Processing PGMQ job: ${jobId}`);
            
            // Process the job
            const success = await processEmbeddingJob(jobId);
            
            if (success) {
              // Delete message from queue
              await supabase.rpc('pgmq_delete', {
                queue_name: 'embedding_queue',
                msg_id: message.msg_id
              });
              processedJobs++;
              console.log(`✅ PGMQ job ${jobId} completed and removed from queue`);
            } else {
              console.log(`❌ PGMQ job ${jobId} failed, will retry later`);
            }
          } catch (jobError) {
            console.error('Error processing PGMQ job:', jobError);
          }
        }
      }
    } catch (pgmqError) {
      console.log('PGMQ not available, using fallback approach:', pgmqError);
      pgmqWorking = false;
    }
    
    // If PGMQ didn't work or no jobs processed, try fallback queue
    if (!pgmqWorking || processedJobs === 0) {
      console.log('🔄 Trying fallback queue system...');
      
      try {
        // Get jobs from fallback queue
        const { data: fallbackJobs, error: fallbackError } = await supabase
          .rpc('get_pending_jobs_fallback', { p_limit: 5 });
        
        if (!fallbackError && fallbackJobs && fallbackJobs.length > 0) {
          console.log(`📊 Found ${fallbackJobs.length} jobs in fallback queue`);
          
          for (const job of fallbackJobs) {
            try {
              console.log(`🎯 Processing fallback job: ${job.job_id}`);
              
              const success = await processEmbeddingJob(job.job_id);
              
              if (success) {
                // Mark job as processed in fallback queue
                await supabase.rpc('mark_job_processed_fallback', {
                  p_job_id: job.job_id
                });
                processedJobs++;
                console.log(`✅ Fallback job ${job.job_id} completed`);
              } else {
                console.log(`❌ Fallback job ${job.job_id} failed`);
              }
            } catch (jobError) {
              console.error(`Error processing fallback job ${job.job_id}:`, jobError);
            }
          }
        } else {
          console.log('No jobs found in fallback queue');
        }
      } catch (fallbackError) {
        console.error('Error accessing fallback queue:', fallbackError);
      }
    }
    
    // If still no jobs processed, try direct database approach
    if (processedJobs === 0) {
      console.log('🔄 Trying direct database approach...');
      
      try {
        // Get pending jobs directly from database
        const { data: pendingJobs, error: dbError } = await supabase
          .from('embedding_jobs')
          .select('job_id')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(5);
        
        if (!dbError && pendingJobs && pendingJobs.length > 0) {
          console.log(`📊 Found ${pendingJobs.length} pending jobs in database`);
          
          for (const job of pendingJobs) {
            try {
              console.log(`🎯 Processing direct job: ${job.job_id}`);
              
              const success = await processEmbeddingJob(job.job_id);
              
              if (success) {
                processedJobs++;
                console.log(`✅ Direct job ${job.job_id} completed`);
              } else {
                console.log(`❌ Direct job ${job.job_id} failed`);
              }
            } catch (jobError) {
              console.error(`Error processing direct job ${job.job_id}:`, jobError);
            }
          }
        } else {
          console.log('No pending jobs found in database');
        }
      } catch (dbError) {
        console.error('Error accessing embedding_jobs table:', dbError);
      }
    }
    
    console.log(`🎉 Embedding processing complete. Processed ${processedJobs} jobs.`);
    
    return NextResponse.json({
      success: true,
      processedJobs,
      method: pgmqWorking ? 'pgmq' : 'fallback',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in embedding cron job:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function processEmbeddingJob(jobId: string): Promise<boolean> {
  try {
    console.log(`🔄 Processing embedding job: ${jobId}`);
    
    // Call the edge function to process the embedding
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embeddings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Edge function error for job ${jobId}:`, errorText);
      return false;
    }
    
    const result = await response.json();
    console.log(`✅ Job ${jobId} processed successfully:`, result);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing job ${jobId}:`, error);
    return false;
  }
} 