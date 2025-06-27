-- COMPREHENSIVE DEBUG ANALYSIS
-- This will help us understand exactly what's happening with file uploads

-- 1. Current state of embedding jobs
SELECT '=== EMBEDDING JOBS OVERVIEW ===' as section;
SELECT 
  content_type,
  status,
  COUNT(*) as count,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM embedding_jobs 
GROUP BY content_type, status 
ORDER BY content_type, status;

-- 2. Recent file uploads (last 2 hours)
SELECT '=== RECENT FILES ===' as section;
SELECT 
  id,
  name,
  "knowledgeSourceId",
  created_at,
  "extractedText" IS NOT NULL as has_extracted_text,
  LENGTH(COALESCE("extractedText", '')) as text_length
FROM files 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- 3. Recent embedding jobs (last 2 hours) 
SELECT '=== RECENT EMBEDDING JOBS ===' as section;
SELECT 
  job_id,
  content_type,
  content_id,
  status,
  created_at,
  SUBSTRING(content, 1, 100) as content_preview,
  LENGTH(content) as content_length
FROM embedding_jobs 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- 4. Duplicate content_ids in embedding jobs
SELECT '=== DUPLICATE JOBS ===' as section;
SELECT 
  content_type,
  content_id,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(status ORDER BY created_at) as statuses,
  ARRAY_AGG(job_id ORDER BY created_at) as job_ids
FROM embedding_jobs 
WHERE content_type = 'file'
GROUP BY content_type, content_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 5. Vector documents vs embedding jobs alignment
SELECT '=== VECTOR DOCUMENTS ===' as section;
SELECT 
  content_type,
  COUNT(*) as count
FROM vector_documents
GROUP BY content_type
ORDER BY content_type;

-- 6. Check for orphaned jobs (jobs without corresponding files)
SELECT '=== ORPHANED JOBS ===' as section;
SELECT 
  ej.content_id,
  ej.status,
  ej.created_at,
  'NO FILE FOUND' as issue
FROM embedding_jobs ej
WHERE ej.content_type = 'file'
AND ej.content_id NOT IN (SELECT id FROM files)
ORDER BY ej.created_at DESC
LIMIT 10;

-- 7. Check for files without jobs
SELECT '=== FILES WITHOUT JOBS ===' as section;
SELECT 
  f.id,
  f.name,
  f.created_at,
  'NO EMBEDDING JOB' as issue
FROM files f
WHERE f."knowledgeSourceId" IS NOT NULL
AND f.id NOT IN (SELECT content_id FROM embedding_jobs WHERE content_type = 'file')
ORDER BY f.created_at DESC
LIMIT 10;

-- 8. Check for specific patterns in recent jobs
SELECT '=== JOB PATTERNS ===' as section;
SELECT 
  DATE_TRUNC('minute', created_at) as minute_bucket,
  content_type,
  status,
  COUNT(*) as jobs_created
FROM embedding_jobs 
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY DATE_TRUNC('minute', created_at), content_type, status
HAVING COUNT(*) > 1
ORDER BY minute_bucket DESC;

-- 9. Check current database triggers
SELECT '=== CURRENT TRIGGERS ===' as section;
SELECT 
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t 
JOIN pg_class c ON t.tgrelid = c.oid 
JOIN pg_namespace n ON c.relnamespace = n.oid 
WHERE c.relname IN ('files', 'text_contents', 'qa_contents', 'vector_documents', 'embedding_jobs')
AND NOT t.tgisinternal
AND n.nspname = 'public'
ORDER BY c.relname, t.tgname; 