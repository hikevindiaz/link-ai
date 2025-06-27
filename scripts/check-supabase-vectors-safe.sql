-- 1. Check installed extensions
SELECT extname, extversion, extnamespace::regnamespace as schema
FROM pg_extension 
WHERE extname IN ('vector', 'pgmq', 'pg_net', 'pg_cron', 'hstore')
ORDER BY extname;

-- 2. Check ALL vector-related tables
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%vector%' 
   OR table_name LIKE '%embedding%'
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

-- 4. Check if knowledge_sources has our custom columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'knowledge_sources'
  AND column_name IN ('supabase_vector_enabled', 'embedding_provider', 'embedding_model', 'embedding_dimensions', 'vectorStoreId')
ORDER BY column_name;

-- 5. Check if vector_documents table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'vector_documents'
) as vector_documents_exists;

-- 6. Check if embedding_job_status table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'embedding_job_status'
) as embedding_job_status_exists;

-- 7. Check what schemas exist
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('pgmq', 'extensions', 'vector')
ORDER BY schema_name;

-- 8. Check for any Supabase-specific vector functions
SELECT 
    routine_schema,
    routine_name
FROM information_schema.routines
WHERE (routine_name LIKE '%vector%' OR routine_name LIKE '%embedding%')
  AND routine_schema != 'pg_catalog'
ORDER BY routine_schema, routine_name; 