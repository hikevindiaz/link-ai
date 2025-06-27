-- Fix for duplicate embedding jobs issue
-- This migration adds a unique constraint to prevent duplicate jobs

-- 1. Clean up existing duplicate jobs (keep the most recent one)
WITH duplicate_jobs AS (
  SELECT 
    job_id,
    knowledge_source_id,
    content_type,
    content_id,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY knowledge_source_id, content_type, content_id 
      ORDER BY 
        CASE 
          WHEN status = 'completed' THEN 1
          WHEN status = 'processing' THEN 2
          WHEN status = 'pending' THEN 3
          ELSE 4
        END,
        created_at DESC
    ) as rn
  FROM embedding_jobs
)
DELETE FROM embedding_jobs
WHERE job_id IN (
  SELECT job_id FROM duplicate_jobs WHERE rn > 1
);

-- 2. Add unique constraint to prevent future duplicates
-- This ensures only one job per (knowledge_source_id, content_type, content_id) combination
ALTER TABLE embedding_jobs 
ADD CONSTRAINT embedding_jobs_unique_content 
UNIQUE (knowledge_source_id, content_type, content_id);

-- 3. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_lookup 
ON embedding_jobs(knowledge_source_id, content_type, content_id, status);

-- 4. Add index for cron job queries
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_pending 
ON embedding_jobs(status, created_at) 
WHERE status = 'pending'; 