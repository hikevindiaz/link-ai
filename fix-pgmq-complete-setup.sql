-- Complete PGMQ Setup and Fix for Production
-- This script handles PGMQ installation, reinstallation, and permission fixes

-- Step 1: Check if PGMQ extension exists
SELECT 'Checking PGMQ Extension' as step;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgmq') THEN
        RAISE NOTICE 'PGMQ extension not found, attempting to install...';
        
        -- Try to install PGMQ extension
        BEGIN
            CREATE EXTENSION IF NOT EXISTS pgmq;
            RAISE NOTICE 'PGMQ extension installed successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not install PGMQ extension: %', SQLERRM;
            RAISE NOTICE 'PGMQ may not be available in this Supabase instance';
        END;
    ELSE
        RAISE NOTICE 'PGMQ extension found';
    END IF;
END $$;

-- Step 2: Check PGMQ functions availability
SELECT 'Checking PGMQ Functions' as step;
DO $$
BEGIN
    -- Test if basic PGMQ functions exist
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'pgmq' AND p.proname = 'send'
    ) THEN
        RAISE NOTICE 'PGMQ functions are available';
    ELSE
        RAISE NOTICE 'PGMQ functions not found - extension may be broken';
    END IF;
END $$;

-- Step 3: Alternative approach - Create our own simple queue system if PGMQ fails
CREATE TABLE IF NOT EXISTS embedding_queue_fallback (
    id SERIAL PRIMARY KEY,
    job_id UUID NOT NULL,
    message JSONB NOT NULL,
    enqueued_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_embedding_queue_fallback_status ON embedding_queue_fallback(status, enqueued_at);

-- Step 4: Create functions to manage our fallback queue
CREATE OR REPLACE FUNCTION queue_embedding_job_fallback(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert job into fallback queue
    INSERT INTO embedding_queue_fallback (job_id, message, status)
    VALUES (p_job_id, jsonb_build_object('job_id', p_job_id), 'pending')
    ON CONFLICT DO NOTHING;
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error queuing job in fallback: %', SQLERRM;
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION get_pending_jobs_fallback(p_limit INT DEFAULT 10)
RETURNS TABLE(job_id UUID, message JSONB)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eq.job_id,
        eq.message
    FROM embedding_queue_fallback eq
    WHERE eq.status = 'pending'
    ORDER BY eq.enqueued_at ASC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION mark_job_processed_fallback(p_job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE embedding_queue_fallback 
    SET status = 'completed', processed_at = NOW()
    WHERE job_id = p_job_id;
    
    RETURN FOUND;
END;
$$;

-- Step 5: Try to set up PGMQ queue or use fallback
SELECT 'Setting up Queue System' as step;
DO $$
DECLARE
    pgmq_available BOOLEAN := FALSE;
BEGIN
    -- Test if PGMQ is working
    BEGIN
        -- Try to call a simple PGMQ function
        PERFORM pgmq.send('test_queue', '{"test": true}');
        PERFORM pgmq.delete('test_queue', 1);
        pgmq_available := TRUE;
        RAISE NOTICE 'PGMQ is working - using PGMQ for queue management';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PGMQ not working: % - using fallback queue system', SQLERRM;
        pgmq_available := FALSE;
    END;
    
    -- If PGMQ is available, try to create embedding queue
    IF pgmq_available THEN
        BEGIN
            PERFORM pgmq.create_queue('embedding_queue');
            RAISE NOTICE 'PGMQ embedding_queue created/verified';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create PGMQ embedding_queue: %', SQLERRM;
        END;
    END IF;
END $$;

-- Step 6: Queue all pending embedding jobs
SELECT 'Queuing Pending Jobs' as step;
DO $$
DECLARE
    job_record RECORD;
    queued_count INT := 0;
    pgmq_working BOOLEAN := FALSE;
BEGIN
    -- Test if PGMQ is working
    BEGIN
        PERFORM pgmq.send('embedding_queue', '{"test": true}');
        pgmq_working := TRUE;
        RAISE NOTICE 'Using PGMQ for queuing jobs';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PGMQ not working, using fallback queue';
        pgmq_working := FALSE;
    END;
    
    -- Queue all pending jobs
    FOR job_record IN 
        SELECT job_id 
        FROM embedding_jobs 
        WHERE status = 'pending'
        ORDER BY created_at ASC
    LOOP
        IF pgmq_working THEN
            -- Use PGMQ
            BEGIN
                PERFORM pgmq.send('embedding_queue', job_record.job_id::text);
                queued_count := queued_count + 1;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to queue job % in PGMQ: %', job_record.job_id, SQLERRM;
            END;
        ELSE
            -- Use fallback queue
            IF queue_embedding_job_fallback(job_record.job_id) THEN
                queued_count := queued_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Total jobs queued: %', queued_count;
END $$;

-- Step 7: Grant permissions (if PGMQ exists)
SELECT 'Setting Permissions' as step;
DO $$
BEGIN
    -- Try to grant PGMQ permissions if schema exists
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'pgmq') THEN
        BEGIN
            GRANT USAGE ON SCHEMA pgmq TO postgres, authenticated, service_role;
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pgmq TO postgres, service_role;
            GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO postgres, service_role, authenticated;
            RAISE NOTICE 'PGMQ permissions granted';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not grant PGMQ permissions: %', SQLERRM;
        END;
    END IF;
    
    -- Grant permissions on fallback queue
    GRANT ALL ON embedding_queue_fallback TO postgres, service_role;
    GRANT SELECT, INSERT, UPDATE ON embedding_queue_fallback TO authenticated;
    GRANT EXECUTE ON FUNCTION queue_embedding_job_fallback(UUID) TO postgres, service_role, authenticated;
    GRANT EXECUTE ON FUNCTION get_pending_jobs_fallback(INT) TO postgres, service_role, authenticated;
    GRANT EXECUTE ON FUNCTION mark_job_processed_fallback(UUID) TO postgres, service_role, authenticated;
    
    RAISE NOTICE 'Fallback queue permissions granted';
END $$;

-- Step 8: Verification
SELECT 'System Status' as step;

-- Check embedding jobs
SELECT 'Pending Jobs in Database' as metric, COUNT(*) as value 
FROM embedding_jobs 
WHERE status = 'pending';

-- Check fallback queue
SELECT 'Jobs in Fallback Queue' as metric, COUNT(*) as value 
FROM embedding_queue_fallback 
WHERE status = 'pending';

-- Check PGMQ queue if available
DO $$
BEGIN
    BEGIN
        PERFORM pgmq.queue_length('embedding_queue');
        RAISE NOTICE 'PGMQ queue is accessible';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'PGMQ queue not accessible - using fallback system';
    END;
END $$;

-- Show recent jobs
SELECT 'Recent Pending Jobs' as info;
SELECT 
    job_id,
    status,
    content_type,
    created_at,
    metadata->>'filename' as filename
FROM embedding_jobs 
WHERE status = 'pending'
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'Queue System Setup Complete!' as status; 