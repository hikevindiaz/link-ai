-- Remove all embedding triggers that create duplicate jobs
-- The API routes now handle embedding job creation directly

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

-- Clean up any pending duplicate jobs created in the last 2 hours
DELETE FROM embedding_jobs 
WHERE content_type = 'file' 
AND status = 'pending'
AND created_at > NOW() - INTERVAL '2 hours'; 