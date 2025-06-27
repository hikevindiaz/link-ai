-- Remove the old embedding_queue_fallback table
-- This table was part of the old complex PGMQ system that we simplified
-- It only contains completed jobs and is no longer needed

DROP TABLE IF EXISTS embedding_queue_fallback; 