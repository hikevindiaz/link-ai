-- Check actual column names in text_contents table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'text_contents'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check actual column names in files table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'files'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check actual column names in qa_contents table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'qa_contents'
AND table_schema = 'public'
ORDER BY ordinal_position; 