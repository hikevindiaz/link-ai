-- Clean up PGMQ jobs and queues
-- This will stop all the retrying embedding jobs

-- First, let's see what queues exist
SELECT 'Current queues:' as info;
SELECT queue_name FROM pgmq.meta();

-- Check if there are any messages in the embedding_queue
SELECT 'Messages in embedding_queue:' as info;
SELECT pgmq.queue_length('embedding_queue') as queue_length;

-- Purge all messages from the embedding_queue
SELECT 'Purging all messages from embedding_queue...' as info;
SELECT pgmq.purge_queue('embedding_queue') as purged_count;

-- Check queue length after purge
SELECT 'Queue length after purge:' as info;
SELECT pgmq.queue_length('embedding_queue') as queue_length_after;

-- If you want to completely drop the queue (optional - only if you want to start fresh)
-- SELECT 'Dropping embedding_queue...' as info;
-- SELECT pgmq.drop_queue('embedding_queue') as dropped;

-- Also clean up any dead letter queue if it exists
SELECT 'Checking for dead letter queue...' as info;
SELECT pgmq.queue_length('embedding_queue_dlq') as dlq_length;

-- Purge dead letter queue if it exists
SELECT 'Purging dead letter queue...' as info;
SELECT pgmq.purge_queue('embedding_queue_dlq') as dlq_purged_count;

-- Show final status
SELECT 'Final status:' as info;
SELECT queue_name, pgmq.queue_length(queue_name) as length 
FROM pgmq.meta() 
WHERE queue_name LIKE '%embedding%';

-- Also clean up the embedding_jobs table to be sure
DELETE FROM embedding_jobs;
SELECT 'Cleaned embedding_jobs table' as info;

-- Show final counts
SELECT 'Final embedding_jobs count:' as info, COUNT(*) as count FROM embedding_jobs; 