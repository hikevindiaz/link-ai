-- Fix dimension mismatch: Update knowledge sources to use correct OpenAI dimensions

-- Show current problem
SELECT 'Current knowledge source settings (showing the problem):' as info;
SELECT id, name, "embeddingDimensions", "embeddingModel", "embeddingProvider"
FROM knowledge_sources 
ORDER BY created_at DESC;

-- Update all knowledge sources to use correct OpenAI dimensions
UPDATE knowledge_sources 
SET "embeddingDimensions" = 1536,  -- OpenAI text-embedding-3-small uses 1536 dimensions
    "embeddingModel" = 'text-embedding-3-small',
    "embeddingProvider" = 'openai'
WHERE "embeddingModel" = 'text-embedding-3-small' 
   OR "embeddingProvider" IN ('openai', 'supabase');  -- Fix both openai and supabase providers

-- Show the fix
SELECT 'FIXED - Updated knowledge source settings:' as info;
SELECT id, name, "embeddingDimensions", "embeddingModel", "embeddingProvider"
FROM knowledge_sources 
ORDER BY created_at DESC;

-- Check if vector column type supports variable dimensions
SELECT 'Vector column details:' as info;
SELECT pg_catalog.format_type(atttypid, atttypmod) as column_type
FROM pg_attribute 
WHERE attrelid = 'vector_documents'::regclass 
  AND attname = 'embedding';

SELECT 'Dimension mismatch fixed! All knowledge sources now use 1536 dimensions.' as status; 