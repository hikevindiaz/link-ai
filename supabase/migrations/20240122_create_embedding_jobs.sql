-- Create embedding_jobs table for queue-based processing
CREATE TABLE IF NOT EXISTS embedding_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_source_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  model_name TEXT DEFAULT 'gte-small',
  dimensions INTEGER DEFAULT 384,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,
  result JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_embedding_jobs_status ON embedding_jobs(status);
CREATE INDEX idx_embedding_jobs_knowledge_source ON embedding_jobs(knowledge_source_id);
CREATE INDEX idx_embedding_jobs_created ON embedding_jobs(created_at);

-- Enable Row Level Security
ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage embedding jobs" ON embedding_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON embedding_jobs TO service_role;
GRANT SELECT ON embedding_jobs TO authenticated; 