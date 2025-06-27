-- Simple Trigger Removal Script - Supabase Compatible
-- This removes all embedding triggers that cause duplicate job creation

-- First, let's see what we're working with using a simple approach
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embed%' OR trigger_name LIKE '%file%';

-- Show current embedding jobs
SELECT content_type, status, COUNT(*) as count
FROM embedding_jobs 
GROUP BY content_type, status;

-- Remove all possible embedding triggers (comprehensive list)
DROP TRIGGER IF EXISTS trigger_file_embedding ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_update ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_update ON files CASCADE;
DROP TRIGGER IF EXISTS queue_embedding_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS queue_embedding_on_update ON files CASCADE;

DROP TRIGGER IF EXISTS trigger_text_content_embedding ON text_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_text_insert ON text_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_text_update ON text_contents CASCADE;

DROP TRIGGER IF EXISTS trigger_qa_content_embedding ON qa_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_qa_insert ON qa_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_qa_update ON qa_contents CASCADE;

-- Remove trigger functions
DROP FUNCTION IF EXISTS util.trigger_file_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.queue_embedding_job CASCADE;

-- Clean up recent pending jobs
DELETE FROM embedding_jobs 
WHERE status = 'pending' 
AND created_at > NOW() - INTERVAL '1 hour';

-- Verify triggers are gone
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SUCCESS: All embedding triggers removed!'
    ELSE '⚠️ ' || COUNT(*) || ' triggers still exist'
  END as result
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embed%';

-- Show final job counts
SELECT 'Final job status' as info, content_type, status, COUNT(*) as count
FROM embedding_jobs 
GROUP BY content_type, status; 