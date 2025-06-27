-- SAFE CLEANUP: Remove old embedding triggers causing PGMQ permission errors
-- This migration removes triggers but preserves all data

-- Drop all old embedding triggers that reference PGMQ
-- These are the common trigger names found in the codebase

-- Text content triggers
DROP TRIGGER IF EXISTS embed_on_text_insert ON text_contents;
DROP TRIGGER IF EXISTS embed_on_text_update ON text_contents;
DROP TRIGGER IF EXISTS trigger_text_content_embedding ON text_contents;
DROP TRIGGER IF EXISTS queue_embedding_on_insert ON text_contents;
DROP TRIGGER IF EXISTS queue_embedding_on_update ON text_contents;

-- QA content triggers  
DROP TRIGGER IF EXISTS embed_on_qa_insert ON qa_contents;
DROP TRIGGER IF EXISTS embed_on_qa_update ON qa_contents;
DROP TRIGGER IF EXISTS trigger_qa_content_embedding ON qa_contents;

-- File triggers
DROP TRIGGER IF EXISTS embed_on_file_insert ON files;
DROP TRIGGER IF EXISTS embed_on_file_update ON files;
DROP TRIGGER IF EXISTS trigger_file_embedding ON files;

-- Website content triggers
DROP TRIGGER IF EXISTS embed_on_website_insert ON website_contents;
DROP TRIGGER IF EXISTS embed_on_website_update ON website_contents;

-- Catalog content triggers
DROP TRIGGER IF EXISTS embed_on_catalog_insert ON catalog_contents;
DROP TRIGGER IF EXISTS embed_on_catalog_update ON catalog_contents;

-- Drop old trigger functions that reference PGMQ (if they exist)
DROP FUNCTION IF EXISTS trigger_embedding_job(text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS enqueue_embedding_job();
DROP FUNCTION IF EXISTS queue_embedding_generation(text, text, text, text, jsonb);

-- Note: We keep all tables and data intact
-- The new simplified system will handle embedding processing differently 