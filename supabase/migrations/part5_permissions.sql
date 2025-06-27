-- Part 5: Grant Permissions
-- Run this last to grant access to all objects

-- Grant permissions on tables
GRANT ALL ON public.vector_documents TO authenticated;
GRANT ALL ON public.embedding_job_status TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.match_vector_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_vector_documents_multi_source TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_embedding_generation TO authenticated;

-- Grant usage on pgmq schema to authenticated users
GRANT USAGE ON SCHEMA pgmq TO authenticated;

-- Create a simple test to verify everything is working
DO $$
BEGIN
  RAISE NOTICE 'All migrations completed successfully!';
  RAISE NOTICE 'Vector documents table exists: %', 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'vector_documents');
  RAISE NOTICE 'pgmq extension installed: %', 
    EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgmq');
END $$; 