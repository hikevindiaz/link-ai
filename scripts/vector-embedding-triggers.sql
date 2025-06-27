-- Create automatic embedding generation triggers for vector_documents table
-- This trigger automatically creates embedding jobs when new documents are inserted
-- or when existing documents are updated

-- Create a simpler trigger function for automatic embedding job creation
CREATE OR REPLACE FUNCTION util.queue_embedding_job_simple()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if embedding is null
    IF NEW.embedding IS NULL THEN
        -- Insert into embedding_jobs table
        INSERT INTO embedding_jobs (
            knowledge_source_id,
            content_type,
            content_id,
            content,
            metadata,
            status
        ) VALUES (
            NEW.knowledge_source_id,
            NEW.content_type,
            NEW.content_id,
            NEW.content,
            NEW.metadata,
            'pending'
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on vector_documents
DROP TRIGGER IF EXISTS queue_embedding_on_insert ON vector_documents;
CREATE TRIGGER queue_embedding_on_insert
    AFTER INSERT ON vector_documents
    FOR EACH ROW
    EXECUTE FUNCTION util.queue_embedding_job_simple();

-- Create trigger for updates too
DROP TRIGGER IF EXISTS queue_embedding_on_update ON vector_documents;
CREATE TRIGGER queue_embedding_on_update
    AFTER UPDATE ON vector_documents
    FOR EACH ROW
    WHEN (NEW.content IS DISTINCT FROM OLD.content AND NEW.embedding IS NULL)
    EXECUTE FUNCTION util.queue_embedding_job_simple(); 