-- Remove file embedding triggers that create duplicate jobs
-- We now handle file processing directly in the API route

-- Drop the triggers
DROP TRIGGER IF EXISTS embed_on_file_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_update ON files CASCADE;
DROP TRIGGER IF EXISTS trigger_file_embedding ON files CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS util.trigger_file_embedding() CASCADE;

-- Verify triggers are removed
SELECT 
  n.nspname as schema_name, 
  c.relname as table_name, 
  t.tgname as trigger_name
FROM pg_trigger t 
JOIN pg_class c ON t.tgrelid = c.oid 
JOIN pg_namespace n ON c.relnamespace = n.oid 
WHERE c.relname = 'files' 
AND NOT t.tgisinternal
AND n.nspname = 'public';

-- Clean up any pending file-type jobs
DELETE FROM embedding_jobs 
WHERE content_type = 'file' 
AND status = 'pending';

-- Show remaining embedding jobs
SELECT 
  content_type, 
  status, 
  COUNT(*) as count 
FROM embedding_jobs 
GROUP BY content_type, status 
ORDER BY content_type, status; 