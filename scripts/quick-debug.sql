-- Quick debug to understand the current situation

-- Recent files
SELECT 'Recent files:' as info, id, name, created_at 
FROM files 
WHERE created_at > NOW() - INTERVAL '4 hours'
ORDER BY created_at DESC 
LIMIT 5;

-- Recent embedding jobs  
SELECT 'Recent jobs:' as info, content_type, content_id, status, created_at
FROM embedding_jobs 
WHERE created_at > NOW() - INTERVAL '4 hours'
ORDER BY created_at DESC 
LIMIT 10;

-- Duplicates
SELECT 'Duplicates:' as info, content_id, COUNT(*) as count
FROM embedding_jobs 
WHERE content_type = 'file'
GROUP BY content_id
HAVING COUNT(*) > 1
ORDER BY count DESC 
LIMIT 5; 