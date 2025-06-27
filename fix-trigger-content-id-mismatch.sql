-- Fix trigger functions to use correct content IDs
-- The issue is that triggers are creating jobs with IDs that don't exist in the database

-- First, let's check the current trigger functions
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embedding%';

-- Drop and recreate the file trigger with correct logic
DROP TRIGGER IF EXISTS trigger_file_embedding ON files;
DROP FUNCTION IF EXISTS util.trigger_file_embedding();

-- Create the corrected file trigger function
CREATE OR REPLACE FUNCTION util.trigger_file_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Debug: Log what we're working with
  RAISE NOTICE 'File trigger fired for ID: %, Name: %, KnowledgeSourceId: %', 
    NEW.id, NEW.name, NEW."knowledgeSourceId";
  
  -- Only process if we have required fields
  IF NEW.id IS NOT NULL AND NEW."knowledgeSourceId" IS NOT NULL THEN
    -- Use the actual NEW.id (not a random generated one)
    PERFORM util.queue_embedding_job(
      NEW."knowledgeSourceId",  -- knowledge_source_id
      'file',                   -- content_type  
      NEW.id,                   -- content_id (use the actual file ID)
      COALESCE(NEW."extractedText", NEW.name, ''), -- content
      jsonb_build_object(
        'filename', NEW.name,
        'mimeType', NEW."mimeType",
        'size', NEW.size,
        'storageUrl', NEW."storageUrl"
      ) -- metadata
    );
    
    RAISE NOTICE 'Queued embedding job for file ID: %', NEW.id;
  ELSE
    RAISE WARNING 'File trigger skipped - missing required fields. ID: %, KnowledgeSourceId: %', 
      NEW.id, NEW."knowledgeSourceId";
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_file_embedding
  AFTER INSERT OR UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_file_embedding();

-- Let's also check and fix text content triggers
DROP TRIGGER IF EXISTS trigger_text_content_embedding ON text_contents;
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding();

CREATE OR REPLACE FUNCTION util.trigger_text_content_embedding()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Text content trigger fired for ID: %, KnowledgeSourceId: %', 
    NEW.id, NEW."knowledgeSourceId";
  
  IF NEW.id IS NOT NULL AND NEW."knowledgeSourceId" IS NOT NULL THEN
    PERFORM util.queue_embedding_job(
      NEW."knowledgeSourceId",
      'text',
      NEW.id,  -- Use actual text content ID
      COALESCE(NEW.content, ''),
      jsonb_build_object('type', 'text_content')
    );
    
    RAISE NOTICE 'Queued embedding job for text content ID: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_text_content_embedding
  AFTER INSERT OR UPDATE ON text_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_text_content_embedding();

-- Fix QA content triggers
DROP TRIGGER IF EXISTS trigger_qa_content_embedding ON qa_contents;
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding();

CREATE OR REPLACE FUNCTION util.trigger_qa_content_embedding()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'QA content trigger fired for ID: %, KnowledgeSourceId: %', 
    NEW.id, NEW."knowledgeSourceId";
  
  IF NEW.id IS NOT NULL AND NEW."knowledgeSourceId" IS NOT NULL THEN
    PERFORM util.queue_embedding_job(
      NEW."knowledgeSourceId",
      'qa',
      NEW.id,  -- Use actual QA content ID
      COALESCE(NEW.question || ' ' || NEW.answer, ''),
      jsonb_build_object('question', NEW.question, 'answer', NEW.answer)
    );
    
    RAISE NOTICE 'Queued embedding job for QA content ID: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_qa_content_embedding
  AFTER INSERT OR UPDATE ON qa_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_qa_content_embedding();

-- Now let's clean up the bad embedding jobs and create new ones for existing files
-- First, delete the failed jobs with non-existent content_ids
DELETE FROM embedding_jobs 
WHERE content_type = 'file' 
AND content_id NOT IN (SELECT id FROM files);

-- Delete the failed jobs from the queue as well
SELECT pgmq.purge_queue('embedding_queue');

-- Now create new embedding jobs for the actual files that exist
INSERT INTO embedding_jobs (
  job_id,
  knowledge_source_id,
  content_type,
  content_id,
  content,
  metadata,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as job_id,
  f."knowledgeSourceId" as knowledge_source_id,
  'file' as content_type,
  f.id as content_id,
  COALESCE(f."extractedText", f.name, '') as content,
  jsonb_build_object(
    'filename', f.name,
    'mimeType', f."mimeType", 
    'size', f.size,
    'storageUrl', f."storageUrl"
  ) as metadata,
  'pending' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM files f
WHERE f."knowledgeSourceId" IS NOT NULL
AND f.id NOT IN (
  SELECT content_id FROM embedding_jobs 
  WHERE content_type = 'file' 
  AND status = 'completed'
);

-- Queue these jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN 
    SELECT job_id FROM embedding_jobs 
    WHERE content_type = 'file' 
    AND status = 'pending'
    AND created_at > NOW() - INTERVAL '1 minute'
  LOOP
    PERFORM pgmq.send('embedding_queue', job_record.job_id::text);
    RAISE NOTICE 'Queued job: %', job_record.job_id;
  END LOOP;
END $$;

-- Verify the results
SELECT 
  'Files in database' as check_type,
  COUNT(*) as count
FROM files
WHERE "knowledgeSourceId" IS NOT NULL

UNION ALL

SELECT 
  'Embedding jobs for files' as check_type,
  COUNT(*) as count  
FROM embedding_jobs
WHERE content_type = 'file'
AND status = 'pending'

UNION ALL

SELECT 
  'Jobs in queue' as check_type,
  pgmq.queue_length('embedding_queue') as count; 