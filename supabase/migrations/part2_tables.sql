-- Part 2: Create Tables
-- Run this after extensions are installed

-- Create the missing vector_documents table
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
  
  -- Add unique constraint for performance
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

-- Create the embedding job queue
SELECT pgmq.create('embedding_jobs'); 