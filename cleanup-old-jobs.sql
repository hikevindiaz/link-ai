-- Clean up old broken embedding jobs that are still causing errors
-- These jobs have content_ids that don't exist in the files table

-- First, let's see what we're dealing with
SELECT 
  'Current embedding jobs' as info,
  job_id,
  content_type,
  content_id,
  status,
  created_at,
  CASE 
    WHEN content_type = 'file' AND content_id NOT IN (SELECT id FROM files) THEN 'BROKEN - File not found'
    WHEN content_type = 'text' AND content_id NOT IN (SELECT id FROM text_contents) THEN 'BROKEN - Text not found'  
    WHEN content_type = 'qa' AND content_id NOT IN (SELECT id FROM qa_contents) THEN 'BROKEN - QA not found'
    ELSE 'OK'
  END as validation_status
FROM embedding_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Delete all broken jobs
DELETE FROM embedding_jobs 
WHERE 
  (content_type = 'file' AND content_id NOT IN (SELECT id FROM files))
  OR (content_type = 'text' AND content_id NOT IN (SELECT id FROM text_contents))
  OR (content_type = 'qa' AND content_id NOT IN (SELECT id FROM qa_contents));

-- Show what's left
SELECT 
  'Remaining embedding jobs after cleanup' as info,
  COUNT(*) as total_jobs,
  status,
  content_type
FROM embedding_jobs
GROUP BY status, content_type
ORDER BY content_type, status;

-- Show the specific files that exist and should have jobs
SELECT 
  'Files that should have embedding jobs' as info,
  f.id as file_id,
  f.name as filename,
  f."knowledgeSourceId",
  CASE 
    WHEN ej.content_id IS NOT NULL THEN 'Has job'
    ELSE 'Missing job'
  END as job_status
FROM files f
LEFT JOIN embedding_jobs ej ON f.id = ej.content_id AND ej.content_type = 'file'
WHERE f."knowledgeSourceId" IS NOT NULL
ORDER BY f.created_at DESC;

-- Create missing jobs for files that don't have them
INSERT INTO embedding_jobs (
  job_id,
  knowledge_source_id,
  content_type,
  content_id,
  content,
  metadata,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as job_id,
  f."knowledgeSourceId" as knowledge_source_id,
  'file' as content_type,
  f.id as content_id,
  COALESCE(f."extractedText", f.name, '') as content,
  jsonb_build_object(
    'filename', f.name,
    'storageProvider', f."storageProvider",
    'storageUrl', f."storageUrl",
    'blobUrl', f."blobUrl"
  ) as metadata,
  'pending' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM files f
WHERE f."knowledgeSourceId" IS NOT NULL
AND f.id NOT IN (
  SELECT content_id FROM embedding_jobs 
  WHERE content_type = 'file'
);

-- Final verification
SELECT 
  'Final status' as info,
  COUNT(*) as count,
  status,
  content_type
FROM embedding_jobs
GROUP BY status, content_type
ORDER BY content_type, status; 