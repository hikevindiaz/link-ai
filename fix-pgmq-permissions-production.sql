-- Production Fix for PGMQ Embedding System
-- This script fixes all PGMQ permission issues and ensures robust operation

-- Step 1: Check current PGMQ status
SELECT 'PGMQ Extension Status' as step;
SELECT extname, extversion FROM pg_extension WHERE extname = 'pgmq';

-- Step 2: Recreate embedding queue if it doesn't exist or has permission issues
SELECT 'Creating/Fixing Embedding Queue' as step;
SELECT pgmq.create_queue('embedding_queue');

-- Step 3: Grant proper permissions to all necessary roles
SELECT 'Fixing PGMQ Permissions' as step;

-- Grant schema permissions
GRANT USAGE ON SCHEMA pgmq TO postgres, authenticated, service_role, anon;

-- Grant table permissions for queue operations
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pgmq TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pgmq TO authenticated;

-- Grant function permissions for queue operations
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO postgres, service_role, authenticated;

-- Step 4: Specifically grant permissions on embedding_queue tables
GRANT ALL PRIVILEGES ON pgmq.q_embedding_queue TO postgres, service_role;
GRANT ALL PRIVILEGES ON pgmq.a_embedding_queue TO postgres, service_role;
GRANT SELECT, INSERT, DELETE ON pgmq.q_embedding_queue TO authenticated;
GRANT SELECT, INSERT, DELETE ON pgmq.a_embedding_queue TO authenticated;

-- Step 5: Test queue functionality
SELECT 'Testing Queue Functionality' as step;
SELECT pgmq.send('embedding_queue', '{"test": "message"}');
SELECT pgmq.read('embedding_queue', 1, 1);
SELECT pgmq.delete('embedding_queue', (SELECT msg_id FROM pgmq.q_embedding_queue WHERE message->>'test' = 'message' LIMIT 1));

-- Step 6: Fix any orphaned jobs by re-queuing pending jobs
SELECT 'Re-queuing Pending Jobs' as step;
DO $$
DECLARE
    job_record RECORD;
    queued_count INT := 0;
BEGIN
    -- Re-queue all pending jobs that aren't in the PGMQ queue
    FOR job_record IN 
        SELECT job_id 
        FROM embedding_jobs 
        WHERE status = 'pending'
        AND job_id::text NOT IN (
            SELECT message->>'job_id' 
            FROM pgmq.q_embedding_queue 
            WHERE message->>'job_id' IS NOT NULL
        )
    LOOP
        -- Send job to queue
        PERFORM pgmq.send('embedding_queue', job_record.job_id::text);
        queued_count := queued_count + 1;
        RAISE NOTICE 'Re-queued job: %', job_record.job_id;
    END LOOP;
    
    RAISE NOTICE 'Total jobs re-queued: %', queued_count;
END $$;

-- Step 7: Verify the fix
SELECT 'Verification Results' as step;

-- Check queue length
SELECT 'Queue Length' as metric, pgmq.queue_length('embedding_queue') as value;

-- Check pending jobs
SELECT 'Pending Jobs' as metric, COUNT(*) as value 
FROM embedding_jobs 
WHERE status = 'pending';

-- Check jobs in queue
SELECT 'Jobs in Queue' as metric, COUNT(*) as value 
FROM pgmq.q_embedding_queue;

-- Show recent jobs status
SELECT 'Recent Jobs Status' as info;
SELECT 
    job_id,
    status,
    content_type,
    created_at,
    CASE 
        WHEN job_id::text IN (SELECT message->>'job_id' FROM pgmq.q_embedding_queue) 
        THEN 'In Queue' 
        ELSE 'Not in Queue' 
    END as queue_status
FROM embedding_jobs 
WHERE status = 'pending'
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'PGMQ Production Fix Complete!' as status; 