-- Remove all old embedding triggers that use PGMQ
-- These are causing permission errors with the simplified system

-- Drop triggers on text_contents table
DROP TRIGGER IF EXISTS embed_on_text_insert ON text_contents;
DROP TRIGGER IF EXISTS embed_on_text_update ON text_contents;
DROP TRIGGER IF EXISTS trigger_text_content_embedding ON text_contents;
DROP TRIGGER IF EXISTS queue_embedding_on_insert ON text_contents;
DROP TRIGGER IF EXISTS queue_embedding_on_update ON text_contents;

-- Drop triggers on qa_contents table  
DROP TRIGGER IF EXISTS embed_on_qa_insert ON qa_contents;
DROP TRIGGER IF EXISTS embed_on_qa_update ON qa_contents;
DROP TRIGGER IF EXISTS trigger_qa_content_embedding ON qa_contents;

-- Drop triggers on files table
DROP TRIGGER IF EXISTS embed_on_file_insert ON files;
DROP TRIGGER IF EXISTS embed_on_file_update ON files;
DROP TRIGGER IF EXISTS trigger_file_embedding ON files;

-- Drop triggers on vector_documents table
DROP TRIGGER IF EXISTS queue_embedding_on_insert ON vector_documents;
DROP TRIGGER IF EXISTS queue_embedding_on_update ON vector_documents;

-- Drop any utility functions that might be using PGMQ
DROP FUNCTION IF EXISTS util.queue_embedding_job(text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding();
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding();
DROP FUNCTION IF EXISTS util.trigger_file_embedding();
DROP FUNCTION IF EXISTS util.queue_embedding_job_simple(); 