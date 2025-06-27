-- Setup for native import_documents function from Supabase Headless Vector Search
-- This migration ensures the vector extension is enabled and documents the setup process

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Document the import_documents setup process
-- The import_documents function is provided by Supabase's Headless Vector Search toolkit
-- To enable it:
-- 1. Clone the repository: git clone https://github.com/supabase-community/chatgpt-your-files.git
-- 2. Link to your project: supabase link --project-ref YOUR_PROJECT_REF
-- 3. Push migrations: supabase db push

-- Step 3: Create a verification function
CREATE OR REPLACE FUNCTION verify_import_documents_setup()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
  v_function_exists boolean;
BEGIN
  -- Check if import_documents exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'import_documents'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    v_result := jsonb_build_object(
      'status', 'ready',
      'message', 'import_documents function is available and ready to use',
      'setup_required', false
    );
  ELSE
    v_result := jsonb_build_object(
      'status', 'not_found',
      'message', 'import_documents function not found',
      'setup_required', true,
      'instructions', jsonb_build_array(
        'Clone https://github.com/supabase-community/chatgpt-your-files.git',
        'Run: supabase link --project-ref YOUR_PROJECT_REF',
        'Run: supabase db push to apply the migrations'
      )
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION verify_import_documents_setup TO authenticated;
GRANT EXECUTE ON FUNCTION verify_import_documents_setup TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION verify_import_documents_setup IS 
'Verifies if import_documents is properly set up. Returns instructions if setup is needed.';

-- Run the verification
DO $$
DECLARE
  v_setup_status jsonb;
BEGIN
  v_setup_status := verify_import_documents_setup();
  
  RAISE NOTICE E'\n========================================';
  RAISE NOTICE 'Import Documents Setup Status:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Status: %', v_setup_status->>'status';
  RAISE NOTICE 'Message: %', v_setup_status->>'message';
  
  IF (v_setup_status->>'setup_required')::boolean THEN
    RAISE NOTICE E'\nSetup Instructions:';
    RAISE NOTICE '%', v_setup_status->'instructions';
  END IF;
  
  RAISE NOTICE E'========================================\n';
END;
$$; 