-- MINIMAL TRIGGER REMOVAL - Root Cause Fix
-- Just removes the triggers causing duplicate jobs, no complex queries

-- Remove all embedding triggers
DROP TRIGGER IF EXISTS trigger_file_embedding ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_on_file_update ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS embed_file_on_update ON files CASCADE;
DROP TRIGGER IF EXISTS queue_embedding_on_insert ON files CASCADE;
DROP TRIGGER IF EXISTS queue_embedding_on_update ON files CASCADE;

-- Remove trigger functions
DROP FUNCTION IF EXISTS util.trigger_file_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding() CASCADE;
DROP FUNCTION IF EXISTS util.queue_embedding_job CASCADE;

-- Clean up pending jobs from last hour
DELETE FROM embedding_jobs WHERE status = 'pending' AND created_at > NOW() - INTERVAL '1 hour';

-- Simple success message
SELECT 'Triggers removed - test file upload now!' as result; 