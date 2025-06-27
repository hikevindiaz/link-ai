-- Part 4 FIX: Convert vector_document_id columns from TEXT to UUID
-- Run this BEFORE the rest of Part 4

-- Convert all vector_document_id columns from TEXT to UUID
ALTER TABLE public."text_contents" 
  ALTER COLUMN vector_document_id TYPE UUID USING vector_document_id::UUID;

ALTER TABLE public."qa_contents" 
  ALTER COLUMN vector_document_id TYPE UUID USING vector_document_id::UUID;

ALTER TABLE public."catalog_contents" 
  ALTER COLUMN vector_document_id TYPE UUID USING vector_document_id::UUID;

ALTER TABLE public."website_contents" 
  ALTER COLUMN vector_document_id TYPE UUID USING vector_document_id::UUID;

ALTER TABLE public."files" 
  ALTER COLUMN vector_document_id TYPE UUID USING vector_document_id::UUID;

-- Now run the rest of Part 4 after this completes 