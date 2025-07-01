-- Fix Vector Search Functions for 1536 Dimensions
-- Run this in your Supabase SQL Editor

-- Update the single source vector search function
CREATE OR REPLACE FUNCTION public.match_vector_documents(
  query_embedding vector(1536),
  source_id TEXT,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  content_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  knowledge_source_id TEXT,
  content_type TEXT,
  content_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vd.id,
    vd.knowledge_source_id,
    vd.content_type,
    vd.content_id,
    vd.content,
    vd.metadata,
    1 - (vd.embedding <=> query_embedding) AS similarity
  FROM public.vector_documents vd
  WHERE 
    vd.knowledge_source_id = source_id
    AND (content_types IS NULL OR vd.content_type = ANY(content_types))
    AND 1 - (vd.embedding <=> query_embedding) > match_threshold
  ORDER BY vd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update the multi-source vector search function
CREATE OR REPLACE FUNCTION public.match_vector_documents_multi_source(
  query_embedding vector(1536),
  source_ids TEXT[],
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  content_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  knowledge_source_id TEXT,
  content_type TEXT,
  content_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vd.id,
    vd.knowledge_source_id,
    vd.content_type,
    vd.content_id,
    vd.content,
    vd.metadata,
    1 - (vd.embedding <=> query_embedding) AS similarity
  FROM public.vector_documents vd
  WHERE 
    vd.knowledge_source_id = ANY(source_ids)
    AND (content_types IS NULL OR vd.content_type = ANY(content_types))
    AND 1 - (vd.embedding <=> query_embedding) > match_threshold
  ORDER BY vd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Verify the functions were updated correctly
SELECT 
  'Vector search functions updated!' as status,
  'Functions now accept vector(1536) and use 0.5 similarity threshold' as details;

-- Show the function signatures to confirm
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('match_vector_documents', 'match_vector_documents_multi_source')
ORDER BY proname; 