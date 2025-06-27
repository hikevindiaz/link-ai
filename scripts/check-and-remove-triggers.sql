-- Check and Remove Database Triggers - Root Cause Fix
-- This script identifies and removes database triggers that automatically create embedding jobs

-- STEP 1: Check what triggers are currently active
SELECT 
    schemaname,
    tablename,
    triggername,
    definition
FROM pg_trigger t 
JOIN pg_class c ON t.tgrelid = c.oid 
JOIN pg_namespace n ON c.relnamespace = n.oid 
WHERE tablename IN ('files', 'text_contents', 'qa_contents', 'website_contents', 'catalog_contents')
AND NOT tgisconstraint;

-- STEP 2: Show current embedding jobs to see the pattern
SELECT 
    content_type,
    status,
    COUNT(*) as count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM embedding_jobs 
GROUP BY content_type, status 
ORDER BY content_type, status;

-- STEP 3: Remove ALL embedding triggers (this is the main fix)
-- File triggers
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

-- STEP 4: Remove trigger functions
DROP FUNCTION IF EXISTS util.trigger_file_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_website_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_catalog_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.queue_embedding_job(text, text, text, text, jsonb) CASCADE;

-- STEP 5: Clean up duplicate/pending jobs created by triggers
DELETE FROM embedding_jobs 
WHERE status = 'pending' 
AND created_at > NOW() - INTERVAL '1 hour'
AND content_type = 'file';

-- STEP 6: Verify triggers are gone
SELECT 
    'After cleanup - Active triggers' as check_type,
    COUNT(*) as count
FROM pg_trigger t 
JOIN pg_class c ON t.tgrelid = c.oid 
JOIN pg_namespace n ON c.relnamespace = n.oid 
WHERE tablename IN ('files', 'text_contents', 'qa_contents', 'website_contents', 'catalog_contents')
AND NOT tgisconstraint
AND triggername LIKE '%embed%';

-- STEP 7: Show final embedding jobs status
SELECT 
    content_type,
    status,
    COUNT(*) as count
FROM embedding_jobs 
GROUP BY content_type, status 
ORDER BY content_type, status;

-- Success message
SELECT 'TRIGGERS REMOVED - Upload flow will now create only ONE job per file' as result; 