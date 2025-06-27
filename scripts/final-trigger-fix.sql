-- FINAL TRIGGER REMOVAL - Handles function signature conflicts
-- This version properly removes functions with specific argument lists

-- Remove all embedding triggers first
DROP TRIGGER IF EXISTS trigger_file_embedding ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_update ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_update ON files CASCADE;
DROP TRIGGER IF EXISTS queue_embedding_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS queue_embedding_on_update ON files CASCADE;

-- Remove triggers from other tables too
DROP TRIGGER IF EXISTS trigger_text_content_embedding ON text_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_text_insert ON text_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_text_update ON text_contents CASCADE;

DROP TRIGGER IF EXISTS trigger_qa_content_embedding ON qa_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_qa_insert ON qa_contents CASCADE;
DROP TRIGGER IF EXISTS embed_on_qa_update ON qa_contents CASCADE;

-- Remove functions with specific signatures to avoid conflicts
DROP FUNCTION IF EXISTS util.trigger_file_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding() CASCADE;

-- Remove all possible versions of queue_embedding_job function
DROP FUNCTION IF EXISTS util.queue_embedding_job(text, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS util.queue_embedding_job(uuid, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS util.queue_embedding_job(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS util.queue_embedding_job(uuid, text, text, text) CASCADE;

-- Clean up recent pending jobs
DELETE FROM embedding_jobs WHERE status = 'pending' AND created_at > NOW() - INTERVAL '1 hour';

-- Success message
SELECT 'All triggers and functions removed successfully!' as result; 