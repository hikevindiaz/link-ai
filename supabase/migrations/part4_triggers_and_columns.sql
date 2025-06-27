-- Part 4: Triggers and Column Updates
-- Run this after functions are created

-- Create triggers for updated_at columns
CREATE TRIGGER update_vector_documents_updated_at
  BEFORE UPDATE ON public.vector_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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
ALTER TABLE public."text_contents"
  ADD CONSTRAINT IF NOT EXISTS text_contents_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL;

ALTER TABLE public."qa_contents"
  ADD CONSTRAINT IF NOT EXISTS qa_contents_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL;

ALTER TABLE public."catalog_contents"
  ADD CONSTRAINT IF NOT EXISTS catalog_contents_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL;

ALTER TABLE public."website_contents"
  ADD CONSTRAINT IF NOT EXISTS website_contents_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL;

ALTER TABLE public."files"
  ADD CONSTRAINT IF NOT EXISTS files_vector_document_id_fkey 
  FOREIGN KEY (vector_document_id) 
  REFERENCES public.vector_documents(id)
  ON DELETE SET NULL; 