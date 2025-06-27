-- Direct cleanup of PGMQ tables and jobs
-- This bypasses the function permission issues

-- Check what PGMQ tables exist
SELECT 'PGMQ tables:' as info;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'pgmq' AND tablename LIKE '%embedding%';

-- Try to delete directly from the queue table (if it exists)
DO $$
BEGIN
    -- Try to delete from the main queue table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'pgmq' AND tablename = 'q_embedding_queue') THEN
        EXECUTE 'DELETE FROM pgmq.q_embedding_queue';
        RAISE NOTICE 'Deleted messages from pgmq.q_embedding_queue';
    ELSE
        RAISE NOTICE 'Table pgmq.q_embedding_queue does not exist';
    END IF;
    
    -- Try to delete from dead letter queue
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'pgmq' AND tablename = 'q_embedding_queue_dlq') THEN
        EXECUTE 'DELETE FROM pgmq.q_embedding_queue_dlq';
        RAISE NOTICE 'Deleted messages from pgmq.q_embedding_queue_dlq';
    ELSE
        RAISE NOTICE 'Table pgmq.q_embedding_queue_dlq does not exist';
    END IF;
    
    -- Try to delete from archive table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'pgmq' AND tablename = 'a_embedding_queue') THEN
        EXECUTE 'DELETE FROM pgmq.a_embedding_queue';
        RAISE NOTICE 'Deleted messages from pgmq.a_embedding_queue';
    ELSE
        RAISE NOTICE 'Table pgmq.a_embedding_queue does not exist';
    END IF;
END $$;

-- Clean up embedding_jobs table
DELETE FROM embedding_jobs;
SELECT 'Cleaned embedding_jobs table - deleted rows:' as info, @@rowcount as deleted_count;

-- Check for any other tables that might contain embedding jobs
SELECT 'All tables with "embedding" in name:' as info;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename ILIKE '%embedding%';

-- Final verification
SELECT 'Final embedding_jobs count:' as info, COUNT(*) as count FROM embedding_jobs; 