-- Run this in Supabase SQL Editor
-- Fix the vector column to support 1536 dimensions instead of 384

-- Show current column type (should be vector(384))
SELECT 'Current vector column type:' as info;
SELECT pg_catalog.format_type(atttypid, atttypmod) as column_type
FROM pg_attribute 
WHERE attrelid = 'vector_documents'::regclass 
  AND attname = 'embedding';

-- Check if there are any existing vector documents that would be affected
SELECT 'Existing vector documents count:' as info;
SELECT COUNT(*) as total_vectors
FROM vector_documents;

-- ALTER the embedding column to support 1536 dimensions
ALTER TABLE vector_documents 
ALTER COLUMN embedding TYPE vector(1536);

-- Verify the change
SELECT 'FIXED - New vector column type:' as info;
SELECT pg_catalog.format_type(atttypid, atttypmod) as column_type
FROM pg_attribute 
WHERE attrelid = 'vector_documents'::regclass 
  AND attname = 'embedding';

SELECT 'Vector column updated to support 1536 dimensions! 🎉' as status; 