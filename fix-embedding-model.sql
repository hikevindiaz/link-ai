-- Fix the embedding model name in knowledge sources
-- Update from incorrect 'gte-small' to correct 'text-embedding-3-small'

-- Check current embedding model settings
SELECT 'Current knowledge source settings:' as info;
SELECT id, name, "embeddingModel", "embeddingDimensions", "embeddingProvider"
FROM knowledge_sources 
ORDER BY created_at DESC;

-- Update any knowledge sources using incorrect model names
UPDATE knowledge_sources 
SET "embeddingModel" = 'text-embedding-3-small',
    "embeddingDimensions" = 1536,  -- OpenAI text-embedding-3-small uses 1536 dimensions
    "embeddingProvider" = 'openai'
WHERE "embeddingModel" IN ('gte-small', 'gte', 'GTE') 
   OR "embeddingModel" IS NULL;

-- Show updated settings
SELECT 'Updated knowledge source settings:' as info;
SELECT id, name, "embeddingModel", "embeddingDimensions", "embeddingProvider"
FROM knowledge_sources 
ORDER BY created_at DESC;

SELECT 'Knowledge sources updated to use correct OpenAI model!' as status; 