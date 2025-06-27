-- Final cleanup of all embedding-related tables
-- Focus on the tables we can actually access

-- Show current counts before cleanup
SELECT 'Before cleanup - embedding_jobs count:' as info, COUNT(*) as count FROM embedding_jobs;

-- Try to clean up the PGMQ job tables we found
DO $$
BEGIN
    -- Try to delete from pgmq.q_embedding_jobs
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'pgmq' AND tablename = 'q_embedding_jobs') THEN
        BEGIN
            EXECUTE 'DELETE FROM pgmq.q_embedding_jobs';
            RAISE NOTICE 'Successfully deleted messages from pgmq.q_embedding_jobs';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'Permission denied for pgmq.q_embedding_jobs';
        END;
    END IF;
    
    -- Try to delete from pgmq.a_embedding_jobs (archive)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'pgmq' AND tablename = 'a_embedding_jobs') THEN
        BEGIN
            EXECUTE 'DELETE FROM pgmq.a_embedding_jobs';
            RAISE NOTICE 'Successfully deleted messages from pgmq.a_embedding_jobs';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'Permission denied for pgmq.a_embedding_jobs';
        END;
    END IF;
    
    -- Try to delete from pgmq.a_embedding_queue (archive)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'pgmq' AND tablename = 'a_embedding_queue') THEN
        BEGIN
            EXECUTE 'DELETE FROM pgmq.a_embedding_queue';
            RAISE NOTICE 'Successfully deleted messages from pgmq.a_embedding_queue';
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'Permission denied for pgmq.a_embedding_queue';
        END;
    END IF;
END $$;

-- Clean up the main embedding_jobs table (this should work)
DELETE FROM embedding_jobs;

-- Show final counts
SELECT 'After cleanup - embedding_jobs count:' as info, COUNT(*) as count FROM embedding_jobs;

-- Check if there are any other processes or connections that might be running embedding jobs
SELECT 'Active connections with embedding in query:' as info;
SELECT pid, usename, application_name, state, query 
FROM pg_stat_activity 
WHERE query ILIKE '%embedding%' 
  AND state = 'active' 
  AND pid != pg_backend_pid();

-- Show all PGMQ tables and their approximate row counts
SELECT 'PGMQ table row counts:' as info;
DO $$
DECLARE
    rec RECORD;
    row_count INTEGER;
BEGIN
    FOR rec IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'pgmq' AND tablename LIKE '%embedding%'
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I.%I', rec.schemaname, rec.tablename) INTO row_count;
            RAISE NOTICE 'Table %.%: % rows', rec.schemaname, rec.tablename, row_count;
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'Table %.%: Permission denied', rec.schemaname, rec.tablename;
        END;
    END LOOP;
END $$; 