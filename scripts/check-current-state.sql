-- QUERY 1: Check installed extensions
SELECT 'INSTALLED EXTENSIONS:' as info;
SELECT extname, extversion
FROM pg_extension 
WHERE extname IN ('vector', 'pgmq', 'pg_net', 'pg_cron', 'hstore');

-- QUERY 2: Check if our custom tables exist
SELECT 'CUSTOM TABLES CHECK:' as info;
SELECT 
    'vector_documents exists: ' || 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vector_documents') 
    THEN 'YES' ELSE 'NO' END as vector_documents_status;

SELECT 
    'embedding_job_status exists: ' || 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embedding_job_status') 
    THEN 'YES' ELSE 'NO' END as embedding_job_status;

-- QUERY 3: Check knowledge_sources columns
SELECT 'KNOWLEDGE_SOURCES COLUMNS:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'knowledge_sources'
  AND column_name IN ('supabase_vector_enabled', 'embedding_provider', 'embedding_model', 'embedding_dimensions', 'vectorStoreId')
ORDER BY column_name;

-- QUERY 4: Check for vector columns in tables
SELECT 'TABLES WITH VECTOR COLUMNS:' as info;
SELECT table_name, column_name
FROM information_schema.columns 
WHERE udt_name = 'vector'
ORDER BY table_name;

-- QUERY 5: Available schemas
SELECT 'AVAILABLE SCHEMAS:' as info;
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('public', 'extensions', 'pgmq'); 