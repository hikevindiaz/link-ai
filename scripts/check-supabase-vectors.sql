-- Check what vector-related extensions are installed
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('vector', 'pgmq', 'pg_net', 'pg_cron', 'hstore');

-- Check if any vector-related tables exist
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%vector%' 
   OR table_name LIKE '%embedding%'
ORDER BY table_schema, table_name;

-- Check if any columns of type 'vector' exist
SELECT 
    table_schema,
    table_name, 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE udt_name = 'vector'
ORDER BY table_schema, table_name, column_name;

-- Check if any vector-related functions exist
SELECT 
    routine_schema,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%vector%' 
   OR routine_name LIKE '%embedding%'
   OR routine_name LIKE '%match%'
ORDER BY routine_schema, routine_name;

-- Check if our specific columns already exist on knowledge_sources
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'knowledge_sources'
  AND column_name IN ('supabase_vector_enabled', 'embedding_provider', 'embedding_model', 'embedding_dimensions', 'vectorStoreId')
ORDER BY column_name;

-- Check if vector_document_id columns exist on content tables
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'vector_document_id'
  AND table_name IN ('text_contents', 'qa_contents', 'catalog_contents', 'website_contents', 'files')
ORDER BY table_name; 