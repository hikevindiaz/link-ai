-- FLUSH PHANTOM EMBEDDING JOBS
-- This script clears all phantom jobs from PGMQ queues that are causing the recurring errors

SELECT 'Starting phantom job cleanup...' as status;

-- Step 1: Check current state before cleanup
SELECT 'Current embedding_jobs in database:' as info, COUNT(*) as count FROM embedding_jobs;

-- Step 2: Try to purge the PGMQ embedding queues
DO $$
BEGIN
    -- Try to purge main embedding queue
    BEGIN
        PERFORM pgmq.purge_queue('embedding_queue');
        RAISE NOTICE 'Successfully purged embedding_queue';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not purge embedding_queue: %', SQLERRM;
    END;
    
    -- Try to purge any embedding_jobs queue  
    BEGIN
        PERFORM pgmq.purge_queue('embedding_jobs');
        RAISE NOTICE 'Successfully purged embedding_jobs queue';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not purge embedding_jobs queue (may not exist): %', SQLERRM;
    END;
    
    -- Try to purge any dead letter queues
    BEGIN
        PERFORM pgmq.purge_queue('embedding_queue_dlq');
        RAISE NOTICE 'Successfully purged dead letter queue';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not purge dead letter queue (may not exist): %', SQLERRM;
    END;
END $$;

-- Step 3: Clean up any orphaned jobs from the database
DO $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM embedding_jobs 
    WHERE status IN ('pending', 'processing') 
    AND created_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old stuck jobs from database', deleted_count;
END $$;

-- Step 4: Check PGMQ queue lengths after cleanup
DO $$
BEGIN
    BEGIN
        RAISE NOTICE 'embedding_queue length after cleanup: %', pgmq.queue_length('embedding_queue');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not check embedding_queue length: %', SQLERRM;
    END;
    
    BEGIN
        RAISE NOTICE 'embedding_jobs queue length after cleanup: %', pgmq.queue_length('embedding_jobs');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'embedding_jobs queue does not exist or cannot access';
    END;
END $$;

-- Step 5: Show final state
SELECT 'Final embedding_jobs in database:' as info, COUNT(*) as count FROM embedding_jobs;
SELECT 'Jobs by status:' as info;
SELECT status, COUNT(*) as count 
FROM embedding_jobs 
GROUP BY status 
ORDER BY status;

SELECT 'Phantom job cleanup complete!' as status; 