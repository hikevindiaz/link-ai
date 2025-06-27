-- Check RLS status on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('knowledge_sources', 'embedding_jobs', 'vector_documents');

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('knowledge_sources', 'embedding_jobs', 'vector_documents')
ORDER BY tablename, policyname;

-- Drop existing service role policies if they exist
DROP POLICY IF EXISTS "Service role bypass" ON public.knowledge_sources;
DROP POLICY IF EXISTS "Service role bypass" ON public.embedding_jobs;
DROP POLICY IF EXISTS "Service role bypass" ON public.vector_documents;

-- Create service role bypass policies
-- These policies allow service role to bypass RLS completely

-- For knowledge_sources
CREATE POLICY "Service role bypass" ON public.knowledge_sources
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- For embedding_jobs
CREATE POLICY "Service role bypass" ON public.embedding_jobs
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- For vector_documents
CREATE POLICY "Service role bypass" ON public.vector_documents
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions to service role
GRANT ALL ON public.knowledge_sources TO service_role;
GRANT ALL ON public.embedding_jobs TO service_role;
GRANT ALL ON public.vector_documents TO service_role;

-- Verify the policies were created
SELECT 
    tablename,
    policyname,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('knowledge_sources', 'embedding_jobs', 'vector_documents')
AND 'service_role' = ANY(roles)
ORDER BY tablename; 