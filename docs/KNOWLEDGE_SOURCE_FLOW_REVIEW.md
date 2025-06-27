# Knowledge Source Flow Review

## Overview
This document reviews the complete knowledge source flow from content creation to vector generation, identifying issues and providing production-ready solutions.

## Current Flow

### 1. **Database Entry Creation** ✅ Working
- Knowledge sources are created in the `knowledge_sources` table
- Content is stored in respective tables (`text_contents`, `file`, `qa_contents`, etc.)
- Each content type has proper foreign key relationships

### 2. **File Upload to Buckets** ✅ Working
- Files are uploaded to Supabase storage buckets
- The `uploadToSupabase` function in `lib/supabase.ts` handles uploads correctly
- Files are stored with unique names to prevent conflicts
- Storage URLs are saved in the database

### 3. **Embedding Job Creation** ✅ Working
- The `process_storage_document` function creates embedding jobs
- Jobs are stored in the `embedding_jobs` table with status 'pending'
- Metadata includes bucket name and file path for storage files

### 4. **Vector Creation** ⚠️ Needs Enhancement
- Edge function `generate-embeddings` processes the jobs
- However, it doesn't handle storage file reading properly

## Issues Found

### 1. **Edge Function File Reading**
The current edge function (`supabase/functions/generate-embeddings/index.ts`) expects the content to be directly in the `content` field of the job, but for storage files, it only contains the file path.

**Issue**: The edge function doesn't read content from storage when `metadata.is_storage_file` is true.

### 2. **No Test Data Hardcoding Found** ✅
- No hardcoded test values were found in the edge functions
- The system is production-ready in this aspect

### 3. **Missing Storage File Processing**
The edge function needs to:
1. Check if `metadata.is_storage_file` is true
2. Read the file content from Supabase storage
3. Process the content based on file type

## Required Fixes

### 1. Update Edge Function to Handle Storage Files

```typescript
// In generate-embeddings/index.ts, add after getting job details:

let content = jobDetails.content;

// Check if this is a storage file
if (jobDetails.metadata?.is_storage_file) {
  const bucketName = jobDetails.metadata.bucket_name;
  const filePath = jobDetails.metadata.file_path;
  
  // Download file from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(bucketName)
    .download(filePath);
    
  if (downloadError) {
    throw new Error(`Failed to download file: ${downloadError.message}`);
  }
  
  // Convert blob to text
  content = await fileData.text();
  
  // For JSON files, parse and format
  if (filePath.endsWith('.json')) {
    try {
      const jsonData = JSON.parse(content);
      // Format based on content type
      if (jsonData._type === 'qa_pair') {
        content = `Question: ${jsonData.question}\nAnswer: ${jsonData.answer}`;
      } else if (jsonData._type === 'catalog') {
        content = `Instructions: ${jsonData.instructions}\n\nProducts:\n${JSON.stringify(jsonData.products, null, 2)}`;
      }
    } catch (e) {
      // Keep original content if parsing fails
    }
  }
}
```

### 2. Add File Type Processing

For different file types (PDF, DOCX, etc.), the edge function should use appropriate libraries to extract text content.

### 3. Update Test Script

The test script should use a valid user ID from your database:

```typescript
// Replace this line in test-knowledge-flow.ts
userId: 'clx6vbvwp0000yfhgvhpjqpfp', // Replace with a valid user ID

// With a query to get a valid user:
const validUser = await prisma.user.findFirst();
if (!validUser) throw new Error('No users found in database');
userId: validUser.id,
```

## Testing Procedure

1. **Run the test script**:
   ```bash
   npx tsx scripts/test-knowledge-flow.ts
   ```

2. **Monitor the logs** for:
   - Successful knowledge source creation
   - File upload confirmation
   - Embedding job creation
   - Vector document generation

3. **Verify in Supabase Dashboard**:
   - Check `embedding_jobs` table for job status
   - Check `vector_documents` table for generated vectors
   - Verify files exist in storage buckets

## Production Checklist

- [x] Database schema is correct
- [x] File upload functionality works
- [x] Embedding jobs are created
- [ ] Edge function reads storage files
- [ ] Edge function processes different file types
- [x] No hardcoded test data
- [ ] Error handling for all edge cases
- [ ] Monitoring and logging in place

## Next Steps

1. Update the edge function to handle storage files
2. Add file type processing libraries (if needed)
3. Run comprehensive tests
4. Deploy updated edge function
5. Monitor production usage 