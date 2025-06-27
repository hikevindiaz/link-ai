-- Remove file embedding triggers that create duplicate jobs
-- We now handle file processing directly in the API routes

-- First, check what triggers exist
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embed%' 
   OR trigger_name LIKE '%file%'
   OR action_statement LIKE '%embedding%'
ORDER BY event_object_table, trigger_name;

-- Drop all file-related embedding triggers
DROP TRIGGER IF EXISTS embed_on_file_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_update ON files CASCADE;
DROP TRIGGER IF EXISTS trigger_file_embedding ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_update ON files CASCADE;

-- Drop the trigger functions
DROP FUNCTION IF EXISTS util.trigger_file_embedding() CASCADE;

-- Clean up any pending file-type jobs that were created by triggers
DELETE FROM embedding_jobs 
WHERE content_type = 'file' 
AND status = 'pending'
AND created_at > NOW() - INTERVAL '1 hour';

-- Show remaining triggers
SELECT 
    'Remaining triggers after cleanup' as info,
    trigger_name,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embed%'
ORDER BY event_object_table, trigger_name;

-- Show embedding job counts by type and status
SELECT 
    content_type, 
    status, 
    COUNT(*) as count 
FROM embedding_jobs 
GROUP BY content_type, status 
ORDER BY content_type, status; 