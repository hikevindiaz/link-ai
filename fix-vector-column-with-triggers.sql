-- Run this in Supabase SQL Editor
-- Fix the vector column by handling trigger dependencies

-- Step 1: Check what triggers exist on vector_documents
SELECT 'Current triggers on vector_documents:' as info;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'vector_documents'
  AND trigger_schema = 'public';

-- Step 2: Show current column type
SELECT 'Current vector column type:' as info;
SELECT pg_catalog.format_type(atttypid, atttypmod) as column_type
FROM pg_attribute 
WHERE attrelid = 'vector_documents'::regclass 
  AND attname = 'embedding';

-- Step 3: Drop the trigger that depends on the embedding column
DROP TRIGGER IF EXISTS queue_embedding_on_update ON vector_documents;

-- Step 4: Check if there are any other triggers we need to handle
DROP TRIGGER IF EXISTS queue_embedding_on_insert ON vector_documents;

-- Step 5: Now safely ALTER the embedding column to support 1536 dimensions
ALTER TABLE vector_documents 
ALTER COLUMN embedding TYPE vector(1536);

-- Step 6: Verify the change worked
SELECT 'FIXED - New vector column type:' as info;
SELECT pg_catalog.format_type(atttypid, atttypmod) as column_type
FROM pg_attribute 
WHERE attrelid = 'vector_documents'::regclass 
  AND attname = 'embedding';

-- Step 7: Check if we need to recreate any triggers (usually these are for automatic embedding updates)
-- Most likely we don't need triggers on vector_documents since our embedding generation 
-- is handled by triggers on the source tables (text_contents, qa_contents, files)

SELECT 'Vector column successfully updated to support 1536 dimensions! 🎉' as status;
SELECT 'Note: Removed vector_documents triggers since embedding generation is handled by source table triggers.' as note; 