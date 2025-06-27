-- Modified Supabase Vector Store Setup
-- This version accounts for existing partial setup

-- Set search path for this session
SET search_path TO public, extensions;

-- Enable required extensions (skip if already exists)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgmq WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- pg_cron is optional, we'll skip it if it fails
DO $$ 
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available, skipping';
END $$;

-- Create the missing vector_documents table that the columns reference!
CREATE TABLE IF NOT EXISTS public.vector_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_source_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'qa', 'file', 'catalog', 'website')),
  content_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384), -- gte-small model dimensions
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add indexes for performance
  UNIQUE(knowledge_source_id, content_type, content_id)
);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS vector_documents_embedding_idx 
  ON public.vector_documents 
  USING hnsw (embedding vector_cosine_ops);

-- Create index for filtering by knowledge source
CREATE INDEX IF NOT EXISTS vector_documents_source_idx 
  ON public.vector_documents(knowledge_source_id);

-- Create index for filtering by content type
CREATE INDEX IF NOT EXISTS vector_documents_type_idx 
  ON public.vector_documents(content_type);

-- Create index on metadata for JSON queries
CREATE INDEX IF NOT EXISTS vector_documents_metadata_idx 
  ON public.vector_documents 
  USING gin(metadata);

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

-- Queue for embedding generation
SELECT extensions.pgmq.create('embedding_jobs');

-- Table to track embedding job status
CREATE TABLE IF NOT EXISTS public.embedding_job_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_source_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  PERFORM extensions.pgmq.send(
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

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vector_documents_updated_at
  BEFORE UPDATE ON public.vector_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_embedding_job_status_updated_at
  BEFORE UPDATE ON public.embedding_job_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to knowledge_sources for Supabase vector integration
-- Skip vectorStoreId as it already exists
ALTER TABLE public."knowledge_sources" 
  ADD COLUMN IF NOT EXISTS supabase_vector_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS embedding_provider TEXT DEFAULT 'gte-small',
  ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'Supabase/gte-small',
  ADD COLUMN IF NOT EXISTS embedding_dimensions INT DEFAULT 384;

-- Now add the foreign key constraints for the existing vector_document_id columns
-- This will ensure referential integrity
ALTER TABLE public."text_contents"
  ADD CONSTRAINT text_contents_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL;

ALTER TABLE public."qa_contents"
  ADD CONSTRAINT qa_contents_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL;

ALTER TABLE public."catalog_contents"
  ADD CONSTRAINT catalog_contents_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL;

ALTER TABLE public."website_contents"
  ADD CONSTRAINT website_contents_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL;

ALTER TABLE public."files"
  ADD CONSTRAINT files_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL;

-- Grant necessary permissions
GRANT ALL ON public.vector_documents TO authenticated;
GRANT ALL ON public.embedding_job_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_vector_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_vector_documents_multi_source TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_embedding_generation TO authenticated;

-- Create a simple function to generate embeddings using built-in gte-small
-- This is a placeholder - the actual implementation will be in the Edge Function
CREATE OR REPLACE FUNCTION public.generate_embedding_placeholder(content TEXT)
RETURNS vector(384)
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is a placeholder that returns a zero vector
  -- The actual embedding generation happens in the Edge Function
  RETURN array_fill(0, ARRAY[384])::vector(384);
END;
$$; 