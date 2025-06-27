-- Migration: Enhanced Chunking Support for Smart GTE + Fallback System
-- This enhances the vector store to better support chunked content and track embedding models

-- Add indexes for better chunk querying performance
CREATE INDEX IF NOT EXISTS idx_vector_documents_content_id_chunk 
  ON public.vector_documents(knowledge_source_id, content_type, content_id);

-- Add index on metadata for chunk-specific queries
CREATE INDEX IF NOT EXISTS idx_vector_documents_metadata_model 
  ON public.vector_documents USING gin((metadata->'model'));

-- Add index on metadata for chunk information
CREATE INDEX IF NOT EXISTS idx_vector_documents_metadata_chunks 
  ON public.vector_documents USING gin((metadata->'chunks_processed'));

-- Enhance embedding_jobs table with chunking information
ALTER TABLE public.embedding_jobs 
  ADD COLUMN IF NOT EXISTS chunking_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS max_chunk_size INTEGER DEFAULT 1800,
  ADD COLUMN IF NOT EXISTS chunk_overlap INTEGER DEFAULT 150,
  ADD COLUMN IF NOT EXISTS chunks_generated INTEGER DEFAULT 1;

-- Create index for chunking-related queries
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_chunking 
  ON public.embedding_jobs(chunking_enabled, status);

-- Update the vector search function to handle chunked content better
CREATE OR REPLACE FUNCTION public.match_vector_documents_with_chunking(
  query_embedding vector(384),
  source_id TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  content_types TEXT[] DEFAULT NULL,
  group_chunks BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  knowledge_source_id TEXT,
  content_type TEXT,
  content_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  model_used TEXT,
  is_chunked BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF group_chunks THEN
    -- Return best chunk per content item
    RETURN QUERY
    WITH ranked_results AS (
      SELECT DISTINCT ON (vd.knowledge_source_id, vd.content_type, vd.content_id)
        vd.id,
        vd.knowledge_source_id,
        vd.content_type,
        vd.content_id,
        vd.content,
        vd.metadata,
        1 - (vd.embedding <=> query_embedding) AS similarity,
        COALESCE(vd.metadata->>'model', 'unknown') AS model_used,
        COALESCE((vd.metadata->>'chunks_processed')::int > 1, false) AS is_chunked
      FROM public.vector_documents vd
      WHERE 
        vd.knowledge_source_id = source_id
        AND (content_types IS NULL OR vd.content_type = ANY(content_types))
        AND 1 - (vd.embedding <=> query_embedding) > match_threshold
      ORDER BY 
        vd.knowledge_source_id, vd.content_type, vd.content_id,
        vd.embedding <=> query_embedding ASC
    )
    SELECT * FROM ranked_results
    ORDER BY similarity DESC
    LIMIT match_count;
  ELSE
    -- Return all chunks
    RETURN QUERY
    SELECT 
      vd.id,
      vd.knowledge_source_id,
      vd.content_type,
      vd.content_id,
      vd.content,
      vd.metadata,
      1 - (vd.embedding <=> query_embedding) AS similarity,
      COALESCE(vd.metadata->>'model', 'unknown') AS model_used,
      COALESCE((vd.metadata->>'chunks_processed')::int > 1, false) AS is_chunked
    FROM public.vector_documents vd
    WHERE 
      vd.knowledge_source_id = source_id
      AND (content_types IS NULL OR vd.content_type = ANY(content_types))
      AND 1 - (vd.embedding <=> query_embedding) > match_threshold
    ORDER BY vd.embedding <=> query_embedding ASC
    LIMIT match_count;
  END IF;
END;
$$;

-- Create function to get embedding model statistics
CREATE OR REPLACE FUNCTION public.get_embedding_model_stats(source_id TEXT DEFAULT NULL)
RETURNS TABLE (
  model_name TEXT,
  total_documents BIGINT,
  avg_similarity_score FLOAT,
  content_types TEXT[],
  last_updated TIMESTAMP
)
LANGUAGE sql
AS $$
  SELECT 
    COALESCE(metadata->>'model', 'unknown') as model_name,
    COUNT(*) as total_documents,
    AVG(CASE 
      WHEN metadata->>'similarity_score' IS NOT NULL 
      THEN (metadata->>'similarity_score')::float 
      ELSE 0.8 
    END) as avg_similarity_score,
    ARRAY_AGG(DISTINCT content_type) as content_types,
    MAX(updated_at) as last_updated
  FROM public.vector_documents 
  WHERE source_id IS NULL OR knowledge_source_id = source_id
  GROUP BY COALESCE(metadata->>'model', 'unknown')
  ORDER BY total_documents DESC;
$$;

-- Create function to clean up failed or stuck embedding jobs
CREATE OR REPLACE FUNCTION public.cleanup_stale_embedding_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Mark jobs as failed if they've been processing for more than 30 minutes
  UPDATE public.embedding_jobs 
  SET 
    status = 'failed',
    error = 'Job timed out',
    completed_at = NOW()
  WHERE 
    status = 'processing' 
    AND started_at < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Delete completed jobs older than 7 days to prevent table bloat
  DELETE FROM public.embedding_jobs 
  WHERE 
    status IN ('completed', 'failed') 
    AND completed_at < NOW() - INTERVAL '7 days';
  
  RETURN cleaned_count;
END;
$$;

-- Create function to get chunking performance metrics
CREATE OR REPLACE FUNCTION public.get_chunking_performance(
  source_id TEXT DEFAULT NULL,
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  model_name TEXT,
  avg_processing_time_seconds FLOAT,
  total_jobs BIGINT,
  success_rate FLOAT,
  avg_chunk_size INTEGER,
  avg_chunks_per_job FLOAT
)
LANGUAGE sql
AS $$
  SELECT 
    model_name,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time_seconds,
    COUNT(*) as total_jobs,
    (COUNT(*) FILTER (WHERE status = 'completed')::float / COUNT(*)) * 100 as success_rate,
    AVG((metadata->>'processed_length')::int) as avg_chunk_size,
    AVG(COALESCE(chunks_generated, 1)) as avg_chunks_per_job
  FROM public.embedding_jobs 
  WHERE 
    created_at > NOW() - INTERVAL '1 day' * days_back
    AND (source_id IS NULL OR knowledge_source_id = source_id)
    AND completed_at IS NOT NULL
  GROUP BY model_name
  ORDER BY total_jobs DESC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.match_vector_documents_with_chunking TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_embedding_model_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_embedding_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.get_chunking_performance TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.match_vector_documents_with_chunking IS 
'Enhanced vector search with support for chunked content. Can group chunks by original content or return all chunks.';

COMMENT ON FUNCTION public.get_embedding_model_stats IS 
'Get statistics about which embedding models are being used and their performance.';

COMMENT ON FUNCTION public.cleanup_stale_embedding_jobs IS 
'Clean up stale and old embedding jobs to prevent table bloat.';

COMMENT ON FUNCTION public.get_chunking_performance IS 
'Get performance metrics for chunking operations including processing times and success rates.'; 