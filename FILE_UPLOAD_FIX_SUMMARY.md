# File Upload Process Fix - Production Ready

## Problem Summary
The file upload tab was creating multiple embedding jobs for the same file, causing:
- Unique constraint violations: `(knowledge_source_id, content_type, content_id)`
- Race conditions during processing
- Over-complicated flow with multiple processing paths
- Inconsistent behavior compared to other tabs

## Root Cause Analysis
1. **Multiple Processing Paths**: Files were being processed in both the main upload route AND the chunked upload route
2. **Race Conditions**: Concurrent requests creating duplicate embedding jobs
3. **Inadequate Duplicate Prevention**: Multiple checks but not atomic operations
4. **Complex Flow**: Text extraction happening in multiple places

## Production-Ready Solution

### 1. Simplified File Upload Flow
**New Process**: User uploads file → Storage upload → Database record → Single embedding job → Edge function handles everything

**Key Changes**:
- Single upload path through `/api/knowledge-sources/[sourceId]/content`
- Atomic embedding job creation with upsert
- Edge function handles complete processing (download → extract → embed → store)
- Disabled chunked upload route to prevent duplicates

### 2. Updated Files

#### `app/api/knowledge-sources/[sourceId]/content/route.ts`
- **Simplified to 3 steps**: Storage upload → DB record → Embedding job creation
- **Robust duplicate prevention**: Checks for existing jobs before creating new ones
- **Atomic operations**: Single embedding job creation with race condition handling
- **Clean error handling**: Proper rollback system for failed operations

#### `lib/vector-service.ts`
- **New `processContentV2`**: Enhanced duplicate prevention checking both vector documents and embedding jobs
- **Atomic job creation**: `createEmbeddingJobAtomic` uses upsert to prevent duplicates
- **Better race condition handling**: Single atomic operation instead of check-then-create pattern

#### `supabase/functions/generate-embeddings/index.ts`
- **Complete processing flow**: Handles file download, text extraction, embedding generation, and storage
- **Robust error handling**: Proper status updates and error logging
- **Atomic vector storage**: Uses upsert to handle concurrent processing attempts
- **File record updates**: Updates the original file record with extracted text

#### `app/api/knowledge-sources/[sourceId]/content/[contentId]/chunked-upload/route.ts`
- **Completely disabled**: Returns success but redirects to main upload route
- **Prevents duplicate processing**: No longer creates additional embedding jobs

### 3. Database Constraint Protection
The existing unique constraint on `embedding_jobs` table prevents duplicates:
```sql
UNIQUE (knowledge_source_id, content_type, content_id)
```

### 4. Cleanup Script
**`scripts/cleanup-duplicate-embedding-jobs.sql`**:
- Removes existing duplicate jobs
- Keeps the best job (completed > processing > pending)
- Shows before/after statistics

## How to Deploy

### Step 1: Run the cleanup script
```sql
-- Execute scripts/cleanup-duplicate-embedding-jobs.sql in your database
-- This removes existing duplicates
```

### Step 2: Deploy the code changes
- The updated files handle all new uploads properly
- No database migrations needed (constraint already exists)

### Step 3: Test the flow
1. Upload a file through the file upload tab
2. Verify only one embedding job is created
3. Confirm the edge function processes it correctly
4. Check that the file record gets updated with extracted text

## Benefits

1. **Eliminates Duplicate Jobs**: Atomic operations prevent race conditions
2. **Simplified Flow**: Single processing path, easier to debug and maintain  
3. **Better Error Handling**: Proper rollback system prevents orphaned data
4. **Production Ready**: Robust duplicate prevention and error recovery
5. **Consistent with Other Tabs**: Same processing pattern as text, QA, etc.

## Technical Details

### Atomic Job Creation
Uses PostgreSQL's `upsert` with `onConflict` to ensure only one job per content item:

```typescript
const { data: job, error } = await supabase
  .from('embedding_jobs')
  .upsert({
    knowledge_source_id: knowledgeSourceId,
    content_type: contentType,
    content_id: contentId,
    // ... other fields
  }, {
    onConflict: 'knowledge_source_id,content_type,content_id'
  })
```

### Complete Edge Function Processing
The edge function now handles the entire flow:
1. Download file from storage
2. Extract text using Tika service  
3. Generate embeddings via OpenAI
4. Store vector document atomically
5. Update job status and file record

### Duplicate Prevention Strategy
- Check for existing vector documents first
- Check for existing embedding jobs (any status)
- Use atomic upsert operations
- Handle concurrent processing gracefully

## Monitoring

Watch for these log messages to confirm proper operation:
- `[EMBEDDINGS] Processing job: {job_id}`
- `[EMBEDDINGS] Job {job_id} completed successfully`
- `[processContentV2] Found existing {status} embedding job: {job_id}, skipping duplicate creation`

## Rollback Plan
If issues occur, you can:
1. Re-enable the chunked upload route (remove the disable logic)
2. Revert to the previous vector service implementation
3. The cleanup script can be re-run to remove any new duplicates

This fix provides a robust, production-ready solution that eliminates the duplicate embedding job issue while maintaining all functionality. 