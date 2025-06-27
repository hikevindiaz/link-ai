-- Clean up pending embedding jobs to test the new system
-- This removes jobs that are stuck in pending state

BEGIN;

-- Show current job status
SELECT 
    status,
    COUNT(*) as count
FROM embedding_jobs 
GROUP BY status
ORDER BY status;

-- Clean up pending jobs (these can be recreated)
DELETE FROM embedding_jobs 
WHERE status = 'pending';

-- Show results
SELECT 
    status,
    COUNT(*) as count
FROM embedding_jobs 
GROUP BY status
ORDER BY status;

COMMIT; 