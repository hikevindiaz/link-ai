-- Fix the trigger functions to call the correct queue_embedding_job function
-- The correct signature is: queue_embedding_job(p_knowledge_source_id, p_content_type, p_content_id, p_content, p_metadata)

-- STEP 1: Drop all triggers first (since they depend on the functions)
DROP TRIGGER IF EXISTS embed_on_text_insert ON text_contents;
DROP TRIGGER IF EXISTS embed_on_text_update ON text_contents;
DROP TRIGGER IF EXISTS embed_on_qa_insert ON qa_contents;
DROP TRIGGER IF EXISTS embed_on_qa_update ON qa_contents;
DROP TRIGGER IF EXISTS embed_on_file_insert ON files;
DROP TRIGGER IF EXISTS embed_on_file_update ON files;

-- STEP 2: Now drop the trigger functions
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding();
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding();
DROP FUNCTION IF EXISTS util.trigger_file_embedding();

-- STEP 3: Create corrected trigger functions with proper function calls
CREATE OR REPLACE FUNCTION util.trigger_text_content_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the correct queue_embedding_job function with all required parameters
  PERFORM util.queue_embedding_job(
    NEW."knowledgeSourceId",  -- p_knowledge_source_id
    'text',                   -- p_content_type
    NEW.id,                   -- p_content_id
    NEW.content,              -- p_content
    '{}'::jsonb               -- p_metadata (empty json)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION util.trigger_qa_content_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the correct queue_embedding_job function with all required parameters
  PERFORM util.queue_embedding_job(
    NEW."knowledgeSourceId",                                          -- p_knowledge_source_id
    'qa',                                                             -- p_content_type
    NEW.id,                                                           -- p_content_id
    CONCAT('Question: ', NEW.question, E'\n\nAnswer: ', NEW.answer),  -- p_content (combine Q&A)
    '{}'::jsonb                                                       -- p_metadata (empty json)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION util.trigger_file_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the correct queue_embedding_job function with all required parameters
  PERFORM util.queue_embedding_job(
    NEW."knowledgeSourceId",                      -- p_knowledge_source_id
    'file',                                       -- p_content_type
    NEW.id,                                       -- p_content_id
    COALESCE(NEW."extractedText", NEW.name),      -- p_content (use extracted text or filename)
    jsonb_build_object('filename', NEW.name)      -- p_metadata (store filename)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Recreate all the triggers
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

SELECT 'All triggers and functions recreated with correct parameters!' as status; 