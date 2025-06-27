-- First, let's see ALL columns in these tables to understand the naming
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('text_contents', 'files', 'qa_contents', 'embedding_jobs')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Create a FIXED version using the actual database column names (snake_case)
-- Prisma maps camelCase in code to snake_case in database
CREATE OR REPLACE FUNCTION util.queue_embedding_job()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id uuid;
  v_knowledge_source_id text;
  v_content text;
  v_content_type text;
BEGIN
  -- Determine content type based on table
  CASE TG_TABLE_NAME
    WHEN 'text_contents' THEN 
      v_content_type := 'text';
      v_content := NEW.content;
    WHEN 'files' THEN 
      v_content_type := 'file';
      -- Use snake_case for actual database columns
      v_content := COALESCE(NEW.extracted_text, NEW.storage_url, NEW.blob_url, NEW.name);
    WHEN 'qa_contents' THEN 
      v_content_type := 'qa';
      v_content := NEW.question || E'\n\n' || NEW.answer;
    ELSE
      v_content_type := TG_TABLE_NAME;
      v_content := 'Unknown content';
  END CASE;

  -- Get knowledge source ID - use snake_case
  v_knowledge_source_id := NEW.knowledge_source_id;

  -- Generate job ID
  v_job_id := gen_random_uuid();

  -- CRITICAL: Insert into embedding_jobs table FIRST
  INSERT INTO embedding_jobs (
    job_id,
    knowledge_source_id,
    content_type,
    content_id,
    content,
    metadata,
    status,
    created_at
  ) VALUES (
    v_job_id,
    v_knowledge_source_id,
    v_content_type,
    NEW.id,
    v_content,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'created_at', NEW.created_at
    ),
    'pending',
    NOW()
  );

  -- THEN queue the job with the SAME job_id
  PERFORM pgmq.send(
    'embedding_queue',
    jsonb_build_object(
      'job_id', v_job_id,
      'msg_id', v_job_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Test the fix by checking if we can access the columns
SELECT 'Column check' as test,
  EXISTS (SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'text_contents' 
          AND column_name = 'knowledge_source_id') as has_snake_case_fk,
  EXISTS (SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'text_contents' 
          AND column_name = 'created_at') as has_created_at; 