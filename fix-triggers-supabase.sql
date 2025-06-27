-- Run this in Supabase SQL Editor
-- First, drop all existing embedding triggers to clean up duplicates
DROP TRIGGER IF EXISTS embed_on_text_insert ON text_contents;
DROP TRIGGER IF EXISTS embed_on_text_update ON text_contents;
DROP TRIGGER IF EXISTS embed_on_qa_insert ON qa_contents;
DROP TRIGGER IF EXISTS embed_on_qa_update ON qa_contents;
DROP TRIGGER IF EXISTS embed_on_file_insert ON files;
DROP TRIGGER IF EXISTS embed_on_file_update ON files;
DROP TRIGGER IF EXISTS embed_file_on_insert ON files;
DROP TRIGGER IF EXISTS embed_file_on_update ON files;
DROP TRIGGER IF EXISTS embed_qa_content_on_insert ON qa_contents;
DROP TRIGGER IF EXISTS embed_qa_content_on_update ON qa_contents;

-- Drop existing trigger functions
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding();
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding();
DROP FUNCTION IF EXISTS util.trigger_file_embedding();

-- Create corrected trigger functions with proper camelCase column names
CREATE OR REPLACE FUNCTION util.trigger_text_content_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue embedding job for text content using correct camelCase columns
  PERFORM util.queue_embedding_job(
    NEW.id,
    'text',
    NEW."knowledgeSourceId"  -- Use camelCase with quotes for case sensitivity
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION util.trigger_qa_content_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue embedding job for QA content using correct camelCase columns
  PERFORM util.queue_embedding_job(
    NEW.id,
    'qa',
    NEW."knowledgeSourceId"  -- Use camelCase with quotes for case sensitivity
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION util.trigger_file_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue embedding job for file using correct camelCase columns
  PERFORM util.queue_embedding_job(
    NEW.id,
    'file',
    NEW."knowledgeSourceId"  -- Use camelCase with quotes for case sensitivity
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the triggers (INSERT and UPDATE for each table)
CREATE TRIGGER embed_on_text_insert
  AFTER INSERT ON text_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_text_content_embedding();

CREATE TRIGGER embed_on_text_update
  AFTER UPDATE ON text_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_text_content_embedding();

CREATE TRIGGER embed_on_qa_insert
  AFTER INSERT ON qa_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_qa_content_embedding();

CREATE TRIGGER embed_on_qa_update
  AFTER UPDATE ON qa_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_qa_content_embedding();

CREATE TRIGGER embed_on_file_insert
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_file_embedding();

CREATE TRIGGER embed_on_file_update
  AFTER UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_file_embedding();

-- Verify the setup
SELECT 'Fixed triggers created successfully!' as status; 