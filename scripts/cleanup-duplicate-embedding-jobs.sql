-- Cleanup script for duplicate embedding jobs
-- This script removes duplicate jobs while keeping the best one for each content item

-- Step 1: Identify and remove duplicate jobs, keeping the best one based on priority:
-- 1. Completed jobs (highest priority)
-- 2. Processing jobs 
-- 3. Pending jobs
-- 4. Most recent job if multiple in same status

BEGIN;

-- First, let's see what we're working with
SELECT 
  knowledge_source_id,
  content_type,
  content_id,
  COUNT(*) as job_count,
  STRING_AGG(status::text, ', ' ORDER BY created_at DESC) as statuses
FROM embedding_jobs 
GROUP BY knowledge_source_id, content_type, content_id 
HAVING COUNT(*) > 1
ORDER BY job_count DESC;

-- Clean up duplicates, keeping the best job for each content
WITH ranked_jobs AS (
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
          WHEN status = 'failed' THEN 4
          ELSE 5
        END,
        created_at DESC
    ) as priority_rank
  FROM embedding_jobs
)
DELETE FROM embedding_jobs
WHERE job_id IN (
  SELECT job_id 
  FROM ranked_jobs 
  WHERE priority_rank > 1
);

-- Show results
SELECT 'Cleanup completed. Remaining jobs:' as message;

SELECT 
  knowledge_source_id,
  content_type,
  content_id,
  COUNT(*) as job_count,
  MAX(status) as status
FROM embedding_jobs 
GROUP BY knowledge_source_id, content_type, content_id 
ORDER BY knowledge_source_id, content_type, content_id;

COMMIT; 