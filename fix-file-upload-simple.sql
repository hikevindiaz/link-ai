-- Fix file upload issues by ensuring required functions exist
-- and providing a fallback for vector processing

-- First, clean up any broken embedding jobs
DELETE FROM embedding_jobs 
WHERE 
  (content_type = 'file' AND content_id NOT IN (SELECT id FROM files))
  OR (content_type = 'text' AND content_id NOT IN (SELECT id FROM text_contents))
  OR (content_type = 'qa' AND content_id NOT IN (SELECT id FROM qa_contents));

-- Check if process_storage_document function exists
DO $$
BEGIN
  -- Try to call the function with dummy parameters to see if it exists
  BEGIN
    PERFORM process_storage_document('test', 'test', 'test', 'test', 'file', '{}'::jsonb);
  EXCEPTION 
    WHEN undefined_function THEN
      RAISE NOTICE 'process_storage_document function does not exist, creating it...';
      
      -- Create the missing function
      EXECUTE '
      CREATE OR REPLACE FUNCTION process_storage_document(
        p_bucket_name TEXT,
        p_file_path TEXT,
        p_knowledge_source_id TEXT,
        p_content_id TEXT,
        p_content_type TEXT,
        p_metadata JSONB DEFAULT ''{}''::jsonb
      ) RETURNS JSONB AS $func$
      DECLARE
        job_id UUID;
        result JSONB;
      BEGIN
        -- Generate a unique job ID
        job_id := gen_random_uuid();
        
        -- Log the function call
        RAISE NOTICE ''process_storage_document called for: % / %'', p_bucket_name, p_file_path;
        
        -- Try to use the util.queue_embedding_job function if it exists
        BEGIN
          PERFORM util.queue_embedding_job(
            p_knowledge_source_id,
            p_content_type,
            p_content_id,
            '''', -- content will be extracted from storage
            p_metadata || jsonb_build_object(
              ''bucket_name'', p_bucket_name,
              ''file_path'', p_file_path,
              ''storage_processing'', true
            )
          );
          
          RAISE NOTICE ''Successfully queued document processing job: %'', job_id;
        EXCEPTION WHEN OTHERS THEN
          -- If util.queue_embedding_job fails, create a direct embedding job
          RAISE NOTICE ''util.queue_embedding_job failed, creating direct job: %'', SQLERRM;
          
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
          ) VALUES (
            job_id,
            p_knowledge_source_id,
            p_content_type,
            p_content_id,
            '''',
            p_metadata || jsonb_build_object(
              ''bucket_name'', p_bucket_name,
              ''file_path'', p_file_path,
              ''storage_processing'', true
            ),
            ''pending'',
            NOW(),
            NOW()
          );
        END;
        
        -- Return success result
        result := jsonb_build_object(
          ''success'', true,
          ''job_id'', job_id,
          ''message'', ''Document queued for processing''
        );
        
        RETURN result;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE ''Error in process_storage_document: %'', SQLERRM;
        RETURN jsonb_build_object(
          ''success'', false,
          ''error'', SQLERRM
        );
      END;
      $func$ LANGUAGE plpgsql;';
      
    WHEN OTHERS THEN
      RAISE NOTICE 'process_storage_document function exists but failed test call: %', SQLERRM;
  END;
END $$;

-- Verify the function was created
SELECT 
  'Function verification' as info,
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'process_storage_document';

-- Test the function with a simple call
SELECT process_storage_document(
  'test-bucket',
  'test-path',
  'test-knowledge-source',
  'test-content-id',
  'file',
  '{"test": true}'::jsonb
) as test_result; 