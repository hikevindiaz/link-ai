-- 1. Check installed extensions
SELECT extname, extversion, extnamespace::regnamespace as schema
FROM pg_extension 
WHERE extname IN ('vector', 'pgmq', 'pg_net', 'pg_cron', 'hstore')
ORDER BY extname;

-- 2. Check ALL vector-related tables (including in different schemas)
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%vector%' 
   OR table_name LIKE '%embedding%'
   OR table_schema = 'extensions'
ORDER BY table_schema, table_name;

-- 3. Check for vector columns in ANY table
SELECT 
    table_schema,
    table_name, 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE udt_name = 'vector' OR data_type LIKE '%vector%'
ORDER BY table_schema, table_name, column_name;

-- 4. Check ALL functions that might be vector-related
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_result(p.oid) as result_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%vector%' 
   OR p.proname LIKE '%embedding%'
   OR p.proname LIKE '%match%'
   OR p.proname LIKE '%similarity%'
ORDER BY n.nspname, p.proname;

-- 5. Check if knowledge_sources has our custom columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'knowledge_sources'
ORDER BY ordinal_position;

-- 6. Check if vector_documents table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'vector_documents'
) as vector_documents_exists;

-- 7. Check if embedding_job_status table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'embedding_job_status'
) as embedding_job_status_exists;

-- 8. Check pgmq queues
SELECT * FROM pgmq.list_queues() WHERE queue_name = 'embedding_jobs'; 