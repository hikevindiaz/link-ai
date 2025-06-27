-- Remove all embedding triggers that create duplicate jobs
-- The API routes now handle embedding job creation directly

-- Check what triggers currently exist
SELECT 
    'Current embedding triggers' as info,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embed%' 
   OR trigger_name LIKE '%file%'
   OR action_statement LIKE '%embedding%'
ORDER BY event_object_table, trigger_name;

-- Drop all embedding-related triggers
DROP TRIGGER IF EXISTS embed_on_file_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_update ON files CASCADE;
DROP TRIGGER IF EXISTS trigger_file_embedding ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_update ON files CASCADE;

DROP TRIGGER IF EXISTS embed_on_text_insert ON text_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_text_update ON text_contents CASCADE;
DROP TRIGGER IF EXISTS trigger_text_content_embedding ON text_contents CASCADE;

DROP TRIGGER IF EXISTS embed_on_qa_insert ON qa_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_qa_update ON qa_contents CASCADE;
DROP TRIGGER IF EXISTS trigger_qa_content_embedding ON qa_contents CASCADE;

DROP TRIGGER IF EXISTS embed_on_website_insert ON website_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_website_update ON website_contents CASCADE;

DROP TRIGGER IF EXISTS embed_on_catalog_insert ON catalog_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_catalog_update ON catalog_contents CASCADE;

-- Drop all trigger functions
DROP FUNCTION IF EXISTS util.trigger_file_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_website_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_catalog_content_embedding() CASCADE;

-- Clean up any pending duplicate jobs
DELETE FROM embedding_jobs 
WHERE content_type = 'file' 
AND status = 'pending'
AND created_at > NOW() - INTERVAL '2 hours';

-- Show final state
SELECT 
    'Triggers after cleanup' as info,
    trigger_name,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embed%'
   OR trigger_name LIKE '%file%'
ORDER BY event_object_table, trigger_name;

-- Show remaining embedding jobs by type and status
SELECT 
    'Embedding jobs summary' as info,
    content_type, 
    status, 
    COUNT(*) as count 
FROM embedding_jobs 
GROUP BY content_type, status 
ORDER BY content_type, status;

-- All embedding triggers have been removed. Embedding jobs will only be created by API routes now. 