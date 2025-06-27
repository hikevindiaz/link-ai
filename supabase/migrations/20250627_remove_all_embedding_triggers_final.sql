-- FINAL FIX: Remove all database triggers that create embedding jobs
-- This migration permanently removes triggers that cause duplicate job creation
-- Version: 2025-06-27 - Root Cause Fix

-- Log the current state before cleanup
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t 
    JOIN pg_class c ON t.tgrelid = c.oid 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE tablename IN ('files', 'text_contents', 'qa_contents', 'website_contents', 'catalog_contents')
    AND NOT tgisconstraint
    AND triggername LIKE '%embed%';
    
    RAISE NOTICE 'Found % embedding triggers to remove', trigger_count;
END $$;

-- Remove ALL embedding-related triggers (comprehensive list)
-- File table triggers
DROP TRIGGER IF EXISTS trigger_file_embedding ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_update ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_update ON files CASCADE;
DROP TRIGGER IF EXISTS queue_embedding_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS queue_embedding_on_update ON files CASCADE;

-- Text content triggers
DROP TRIGGER IF EXISTS trigger_text_content_embedding ON text_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_text_insert ON text_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_text_update ON text_contents CASCADE;

-- QA content triggers
DROP TRIGGER IF EXISTS trigger_qa_content_embedding ON qa_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_qa_insert ON qa_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_qa_update ON qa_contents CASCADE;

-- Website content triggers
DROP TRIGGER IF EXISTS embed_on_website_insert ON website_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_website_update ON website_contents CASCADE;

-- Catalog content triggers
DROP TRIGGER IF EXISTS embed_on_catalog_insert ON catalog_contents CASCADE;  
DROP TRIGGER IF EXISTS embed_on_catalog_update ON catalog_contents CASCADE;

-- Remove all trigger functions
DROP FUNCTION IF EXISTS util.trigger_file_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_website_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_catalog_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.queue_embedding_job(text, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS util.queue_embedding_job(uuid, text, text, text, jsonb) CASCADE;

-- Clean up any recent duplicate jobs created by triggers
DELETE FROM embedding_jobs 
WHERE status = 'pending' 
AND created_at > NOW() - INTERVAL '2 hours'
AND (
    -- Remove jobs that might have been created by triggers
    metadata->>'trigger_created' = 'true'
    OR (
        content_type = 'file' 
        AND content ~ '^File: '
        AND LENGTH(content) < 100
    )
);

-- Verify cleanup
DO $$
DECLARE
    remaining_triggers INTEGER;
    job_count INTEGER;
BEGIN
    -- Check remaining triggers
    SELECT COUNT(*) INTO remaining_triggers
    FROM pg_trigger t 
    JOIN pg_class c ON t.tgrelid = c.oid 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE tablename IN ('files', 'text_contents', 'qa_contents', 'website_contents', 'catalog_contents')
    AND NOT tgisconstraint
    AND triggername LIKE '%embed%';
    
    -- Check pending jobs
    SELECT COUNT(*) INTO job_count
    FROM embedding_jobs
    WHERE status = 'pending';
    
    RAISE NOTICE 'Cleanup complete: % embedding triggers remaining, % pending jobs', 
        remaining_triggers, job_count;
        
    IF remaining_triggers = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All embedding triggers removed!';
        RAISE NOTICE '✅ File uploads will now create only ONE embedding job per file';
    ELSE
        RAISE NOTICE '⚠️  WARNING: % embedding triggers still exist', remaining_triggers;
    END IF;
END $$; 