-- Part 4: Triggers and Column Updates (FIXED)
-- Run this after functions are created

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_vector_documents_updated_at ON public.vector_documents;
CREATE TRIGGER update_vector_documents_updated_at
  BEFORE UPDATE ON public.vector_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_embedding_job_status_updated_at ON public.embedding_job_status;
CREATE TRIGGER update_embedding_job_status_updated_at
  BEFORE UPDATE ON public.embedding_job_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to knowledge_sources for Supabase vector integration
ALTER TABLE public."knowledge_sources" 
  ADD COLUMN IF NOT EXISTS supabase_vector_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS embedding_provider TEXT DEFAULT 'gte-small',
  ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'Supabase/gte-small',
  ADD COLUMN IF NOT EXISTS embedding_dimensions INT DEFAULT 384;

-- Add foreign key constraints for existing vector_document_id columns
-- Drop existing constraints first if they exist, then add them
DO $$ 
BEGIN
  -- text_contents
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'text_contents_vector_document_id_fkey') THEN
    ALTER TABLE public."text_contents"
      ADD CONSTRAINT text_contents_vector_document_id_fkey 
      FOREIGN KEY (vector_document_id) 
      REFERENCES public.vector_documents(id)
      ON DELETE SET NULL;
  END IF;

  -- qa_contents
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_contents_vector_document_id_fkey') THEN
    ALTER TABLE public."qa_contents"
      ADD CONSTRAINT qa_contents_vector_document_id_fkey 
      FOREIGN KEY (vector_document_id) 
      REFERENCES public.vector_documents(id)
      ON DELETE SET NULL;
  END IF;

  -- catalog_contents
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalog_contents_vector_document_id_fkey') THEN
    ALTER TABLE public."catalog_contents"
      ADD CONSTRAINT catalog_contents_vector_document_id_fkey 
      FOREIGN KEY (vector_document_id) 
      REFERENCES public.vector_documents(id)
      ON DELETE SET NULL;
  END IF;

  -- website_contents
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'website_contents_vector_document_id_fkey') THEN
    ALTER TABLE public."website_contents"
      ADD CONSTRAINT website_contents_vector_document_id_fkey 
      FOREIGN KEY (vector_document_id) 
      REFERENCES public.vector_documents(id)
      ON DELETE SET NULL;
  END IF;

  -- files
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_vector_document_id_fkey') THEN
    ALTER TABLE public."files"
      ADD CONSTRAINT files_vector_document_id_fkey 
      FOREIGN KEY (vector_document_id) 
      REFERENCES public.vector_documents(id)
      ON DELETE SET NULL;
  END IF;
END $$; 