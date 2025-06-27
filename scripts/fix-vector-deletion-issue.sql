-- Fix vector deletion issue and clean up duplicates
-- This addresses two problems:
-- 1. Vector entries created with 'text' type but files trying to delete with 'file' type
-- 2. Duplicate embedding jobs

-- First, let's see what we have
SELECT 'Current state before fixes' as info;

SELECT 'Vector documents by type' as category, content_type, COUNT(*) as count
FROM vector_documents
GROUP BY content_type

UNION ALL

SELECT 'Embedding jobs by type and status' as category, 
       CONCAT(content_type, ' (', status, ')') as content_type, 
       COUNT(*) as count
FROM embedding_jobs
GROUP BY content_type, status

ORDER BY category, content_type;

-- Check for mismatched vector documents (text type but content_id matches file IDs)
SELECT 'Mismatched vector documents (text type with file IDs)' as info;
SELECT 
  vd.content_id,
  vd.content_type as vector_type,
  f.name as file_name,
  vd.knowledge_source_id
FROM vector_documents vd
JOIN files f ON vd.content_id = f.id
WHERE vd.content_type = 'text'
AND f.id IS NOT NULL
LIMIT 10;

-- Fix 1: Update mismatched vector documents from 'text' to 'file' type
UPDATE vector_documents 
SET content_type = 'file'
WHERE content_type = 'text' 
AND content_id IN (SELECT id FROM files);

-- Fix 2: Update mismatched embedding jobs from 'text' to 'file' type  
UPDATE embedding_jobs
SET content_type = 'file'
WHERE content_type = 'text'
AND content_id IN (SELECT id FROM files);

-- Fix 3: Remove duplicate embedding jobs (keep the most recent one for each content)
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
        CASE WHEN status = 'completed' THEN 1 
             WHEN status = 'processing' THEN 2 
             WHEN status = 'pending' THEN 3 
             ELSE 4 END,
        created_at DESC
    ) as rn
  FROM embedding_jobs
  WHERE content_type = 'file'
),
jobs_to_delete AS (
  SELECT job_id 
  FROM ranked_jobs 
  WHERE rn > 1
)
DELETE FROM embedding_jobs 
WHERE job_id IN (SELECT job_id FROM jobs_to_delete);

-- Fix 4: Clean up orphaned vector documents (no corresponding files)
DELETE FROM vector_documents 
WHERE content_type = 'file'
AND content_id NOT IN (SELECT id FROM files);

-- Fix 5: Clean up orphaned embedding jobs (no corresponding files)
DELETE FROM embedding_jobs
WHERE content_type = 'file'
AND content_id NOT IN (SELECT id FROM files);

-- Show final state
SELECT 'Final state after fixes' as info;

SELECT 'Vector documents by type' as category, content_type, COUNT(*) as count
FROM vector_documents
GROUP BY content_type

UNION ALL

SELECT 'Embedding jobs by type and status' as category, 
       CONCAT(content_type, ' (', status, ')') as content_type, 
       COUNT(*) as count
FROM embedding_jobs
GROUP BY content_type, status

ORDER BY category, content_type;

-- Show any remaining duplicates
SELECT 'Remaining duplicate embedding jobs' as info;
SELECT 
  content_type,
  content_id,
  COUNT(*) as count
FROM embedding_jobs 
WHERE content_type = 'file'
GROUP BY content_type, content_id
HAVING COUNT(*) > 1
ORDER BY count DESC; 