-- Check if process_storage_document function exists
SELECT 
  'Function exists check' as info,
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'process_storage_document';

-- Check if we have the util.queue_embedding_job function
SELECT 
  'util.queue_embedding_job check' as info,
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'queue_embedding_job' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'util');

-- If the function doesn't exist, create it
-- This function should queue embedding jobs for storage documents
CREATE OR REPLACE FUNCTION process_storage_document(
  p_bucket_name TEXT,
  p_file_path TEXT,
  p_knowledge_source_id TEXT,
  p_content_id TEXT,
  p_content_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  job_id UUID;
  result JSONB;
BEGIN
  -- Generate a unique job ID
  job_id := gen_random_uuid();
  
  -- Log the function call
  RAISE NOTICE 'process_storage_document called for: % / %', p_bucket_name, p_file_path;
  
  -- Use the util.queue_embedding_job function to create the embedding job
  PERFORM util.queue_embedding_job(
    p_knowledge_source_id,
    p_content_type,
    p_content_id,
    '', -- content will be extracted from storage
    p_metadata || jsonb_build_object(
      'bucket_name', p_bucket_name,
      'file_path', p_file_path,
      'storage_processing', true
    )
  );
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'job_id', job_id,
    'message', 'Document queued for processing'
  );
  
  RAISE NOTICE 'Successfully queued document processing job: %', job_id;
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in process_storage_document: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql; 