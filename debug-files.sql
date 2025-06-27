-- Check recent files in the database
SELECT 
  id,
  name,
  "storageUrl",
  "storageProvider", 
  "extractedText",
  "createdAt",
  "knowledgeSourceId"
FROM files 
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check recent embedding jobs
SELECT 
  job_id,
  knowledge_source_id,
  content_type,
  content_id,
  status,
  error,
  created_at
FROM embedding_jobs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10; 