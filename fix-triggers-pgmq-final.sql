-- Fix trigger functions to use correct content IDs
-- Handle existing triggers properly with CASCADE on the function drop
-- Fix all pgmq function signature issues

-- First, let's see what triggers currently exist
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embed%' OR trigger_name LIKE '%embedding%';

-- Drop the function with CASCADE - this will automatically drop dependent triggers
DROP FUNCTION IF EXISTS util.trigger_file_embedding() CASCADE;

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
        'storageProvider', NEW."storageProvider",
        'storageUrl', NEW."storageUrl",
        'blobUrl', NEW."blobUrl"
      ) -- metadata (only use fields that exist)
    );
    
    RAISE NOTICE 'Queued embedding job for file ID: %', NEW.id;
  ELSE
    RAISE WARNING 'File trigger skipped - missing required fields. ID: %, KnowledgeSourceId: %', 
      NEW.id, NEW."knowledgeSourceId";
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new triggers with the original names
CREATE TRIGGER embed_on_file_insert
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_file_embedding();

CREATE TRIGGER embed_on_file_update
  AFTER UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_file_embedding();

-- Fix text content triggers
DROP FUNCTION IF EXISTS util.trigger_text_content_embedding() CASCADE;

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

CREATE TRIGGER embed_on_text_insert
  AFTER INSERT ON text_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_text_content_embedding();

CREATE TRIGGER embed_on_text_update
  AFTER UPDATE ON text_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_text_content_embedding();

-- Fix QA content triggers
DROP FUNCTION IF EXISTS util.trigger_qa_content_embedding() CASCADE;

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

CREATE TRIGGER embed_on_qa_insert
  AFTER INSERT ON qa_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_qa_content_embedding();

CREATE TRIGGER embed_on_qa_update
  AFTER UPDATE ON qa_contents
  FOR EACH ROW
  EXECUTE FUNCTION util.trigger_qa_content_embedding();

-- Now clean up the bad embedding jobs and create new ones for existing files
DO $$
DECLARE
  deleted_count INT;
  created_count INT;
  job_record RECORD;
  job_count INT := 0;
  queue_result BIGINT;
  pgmq_available BOOLEAN := FALSE;
BEGIN
  -- Check if pgmq extension is available
  BEGIN
    PERFORM pgmq.create_queue('test_queue');
    PERFORM pgmq.drop_queue('test_queue');
    pgmq_available := TRUE;
    RAISE NOTICE 'PGMQ extension is available';
  EXCEPTION WHEN OTHERS THEN
    pgmq_available := FALSE;
    RAISE NOTICE 'PGMQ extension not available or not working: %', SQLERRM;
  END;

  -- Delete the failed jobs with non-existent content_ids
  DELETE FROM embedding_jobs 
  WHERE content_type = 'file' 
  AND content_id NOT IN (SELECT id FROM files);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % failed file jobs with non-existent content_ids', deleted_count;
  
  -- Clean up the queue if pgmq is available
  IF pgmq_available THEN
    BEGIN
      PERFORM pgmq.purge_queue('embedding_queue'::text);
      RAISE NOTICE 'Purged embedding queue';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to purge queue: %', SQLERRM;
    END;
  END IF;
  
  -- Create new embedding jobs for the actual files that exist
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
      'storageProvider', f."storageProvider",
      'storageUrl', f."storageUrl",
      'blobUrl', f."blobUrl"
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
  
  GET DIAGNOSTICS created_count = ROW_COUNT;
  RAISE NOTICE 'Created % new embedding jobs for existing files', created_count;
  
  -- Queue these jobs only if pgmq is available
  IF pgmq_available THEN
    FOR job_record IN 
      SELECT job_id FROM embedding_jobs 
      WHERE content_type = 'file' 
      AND status = 'pending'
      AND created_at > NOW() - INTERVAL '1 minute'
    LOOP
      -- Try different pgmq.send signatures
      BEGIN
        -- Try with jsonb message
        SELECT pgmq.send('embedding_queue'::text, jsonb_build_object('job_id', job_record.job_id)) INTO queue_result;
        job_count := job_count + 1;
        RAISE NOTICE 'Queued job (jsonb): %', job_record.job_id;
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          -- Try with text message
          SELECT pgmq.send('embedding_queue'::text, job_record.job_id::text) INTO queue_result;
          job_count := job_count + 1;
          RAISE NOTICE 'Queued job (text): %', job_record.job_id;
        EXCEPTION WHEN OTHERS THEN
          BEGIN
            -- Try with varchar casting
            SELECT pgmq.send('embedding_queue'::varchar, job_record.job_id::varchar) INTO queue_result;
            job_count := job_count + 1;
            RAISE NOTICE 'Queued job (varchar): %', job_record.job_id;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to queue job: %, Error: %', job_record.job_id, SQLERRM;
          END;
        END;
      END;
    END LOOP;
    
    RAISE NOTICE 'Total jobs queued: %', job_count;
  ELSE
    RAISE NOTICE 'Skipped queueing jobs - PGMQ not available. Jobs created in database: %', created_count;
  END IF;
END $$;

-- Verify the results (without using pgmq functions that might not work)
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
  'Total embedding jobs' as check_type,
  COUNT(*) as count
FROM embedding_jobs;

-- Show current triggers
SELECT 
    'Current triggers' as info,
    trigger_name,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embed%'
ORDER BY event_object_table, trigger_name;

-- Show a sample of the embedding jobs created
SELECT 
  'Sample embedding jobs' as info,
  job_id,
  content_type,
  content_id,
  LEFT(content, 50) as content_preview,
  status,
  created_at
FROM embedding_jobs
WHERE content_type = 'file'
ORDER BY created_at DESC
LIMIT 5; 