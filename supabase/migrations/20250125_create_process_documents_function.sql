-- Custom document processing function for robust vector handling
-- This replaces the need for import_documents

-- Create a function to process documents from storage
CREATE OR REPLACE FUNCTION process_storage_document(
  p_bucket_name text,
  p_file_path text,
  p_knowledge_source_id uuid,
  p_content_id text,
  p_content_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_job_id text;
BEGIN
  -- Generate a job ID
  v_job_id := gen_random_uuid()::text;
  
  -- Create an embedding job that will be processed by our edge function
  INSERT INTO embedding_jobs (
    job_id,
    knowledge_source_id,
    content_type,
    content_id,
    content,
    metadata,
    model_name,
    dimensions,
    status,
    created_at
  ) VALUES (
    v_job_id,
    p_knowledge_source_id,
    p_content_type,
    p_content_id,
    p_file_path, -- Store the file path, edge function will read from storage
    p_metadata || jsonb_build_object(
      'bucket_name', p_bucket_name,
      'file_path', p_file_path,
      'is_storage_file', true
    ),
    'gte-small',
    384,
    'pending',
    now()
  );
  
  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'message', 'Document queued for processing'
  );
  
  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_storage_document TO authenticated;
GRANT EXECUTE ON FUNCTION process_storage_document TO service_role;

-- Create a simpler wrapper that matches our expected interface
CREATE OR REPLACE FUNCTION import_documents(
  schema text,
  table_name text,
  bucket_name text,
  path text,
  embedding_model text DEFAULT 'gte-small',
  chunk_size int DEFAULT 5000,
  chunk_overlap int DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
  v_knowledge_source_id uuid;
  v_content_id text;
BEGIN
  -- For now, we need these to be passed via metadata
  -- This is a limitation we'll document
  v_result := jsonb_build_object(
    'success', false,
    'error', 'Please use process_storage_document function directly with knowledge_source_id and content_id'
  );
  
  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION import_documents TO authenticated;
GRANT EXECUTE ON FUNCTION import_documents TO service_role;

-- Update our verification function to show the new approach
CREATE OR REPLACE FUNCTION verify_import_documents_setup()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'status', 'ready',
    'message', 'Custom document processing is available',
    'setup_required', false,
    'function_to_use', 'process_storage_document',
    'note', 'Using custom implementation optimized for your setup'
  );
END;
$$;

COMMENT ON FUNCTION process_storage_document IS 
'Processes documents from Supabase storage buckets. Creates embedding jobs that are processed by the edge function.';

COMMENT ON FUNCTION import_documents IS 
'Compatibility wrapper. Use process_storage_document instead.'; 