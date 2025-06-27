-- Part 3: Create Functions
-- Run this after tables are created

-- Function to search vectors with filters
CREATE OR REPLACE FUNCTION public.match_vector_documents(
  query_embedding vector(384),
  source_id TEXT,
  match_threshold FLOAT DEFAULT 0.7,
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

-- Function to search across multiple knowledge sources
CREATE OR REPLACE FUNCTION public.match_vector_documents_multi_source(
  query_embedding vector(384),
  source_ids TEXT[],
  match_threshold FLOAT DEFAULT 0.7,
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

-- Function to queue embedding generation
CREATE OR REPLACE FUNCTION public.queue_embedding_generation(
  p_knowledge_source_id TEXT,
  p_content_type TEXT,
  p_content_id TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  job_id UUID;
BEGIN
  -- Insert job status
  INSERT INTO public.embedding_job_status (knowledge_source_id, content_type, content_id, status)
  VALUES (p_knowledge_source_id, p_content_type, p_content_id, 'pending')
  RETURNING id INTO job_id;
  
  -- Queue the job
  PERFORM pgmq.send(
    queue_name => 'embedding_jobs',
    msg => jsonb_build_object(
      'job_id', job_id,
      'knowledge_source_id', p_knowledge_source_id,
      'content_type', p_content_type,
      'content_id', p_content_id,
      'content', p_content,
      'metadata', p_metadata
    )
  );
  
  RETURN job_id;
END;
$$;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 