# Supabase Vector Store Launch Plan

## Phase 1: Environment Setup & Database Preparation

### Step 1.1: Update Environment Variables
```bash
# Add to .env.local
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
USE_SUPABASE_VECTORS=false  # Keep false during testing
OPENAI_API_KEY=your-openai-api-key  # Still needed for embeddings
```

### Step 1.2: Generate Prisma Client
```bash
npx prisma generate
```
**Expected**: TypeScript errors should disappear

### Step 1.3: Push Database Schema Changes
```bash
npx prisma db push
```
**Expected**: New fields added to knowledge_sources and content tables

### Step 1.4: Run Supabase Migration
1. Copy contents of `supabase/migrations/20240120_vector_store_setup.sql`
2. Go to Supabase Dashboard > SQL Editor
3. Paste and run the migration
**Expected**: Extensions enabled, tables and functions created

### Step 1.5: Deploy Edge Function
```bash
cd supabase/functions/process-embeddings
supabase functions deploy process-embeddings --no-verify-jwt

# Set the OpenAI key for the function
supabase secrets set OPENAI_API_KEY=your-openai-api-key
```
**Expected**: Function deployed successfully

## Phase 2: Code Updates

### Step 2.1: Update Text Tab
Replace imports in `components/knowledge-base/text-tab.tsx`:

```typescript
// Find:
import { processContentToVectorStore } from '@/lib/knowledge-vector-integration';

// Replace with:
import { processContentToVectorStore, handleContentDeletion } from '@/lib/vector-store-adapter';
```

Update the delete handler to use the adapter.

### Step 2.2: Update Q&A Tab
Update `components/knowledge-base/qa-tab.tsx`:

```typescript
// Replace imports
import { processContentToVectorStore, handleContentDeletion } from '@/lib/vector-store-adapter';
```

### Step 2.3: Update Catalog Tab
Update `components/knowledge-base/catalog-tab.tsx`:

```typescript
// Replace imports
import { processContentToVectorStore } from '@/lib/vector-store-adapter';
```

### Step 2.4: Update Website Tab
Update `components/knowledge-base/website-tab.tsx` for website content handling.

### Step 2.5: Update File Upload Tab
Update file handling to use the new vector store adapter.

### Step 2.6: Update API Routes
Update all API routes in `app/api/knowledge-sources/[sourceId]/` to use the adapter.

## Phase 3: Testing

### Step 3.1: Test with Feature Flag Disabled
1. Create a new knowledge source
2. Add text content
3. Verify it still uses OpenAI vector store
4. Check vector-status endpoint

### Step 3.2: Enable Supabase for Test Source
```sql
-- In Supabase SQL Editor
UPDATE knowledge_sources 
SET supabase_vector_enabled = true 
WHERE id = 'your-test-source-id';
```

### Step 3.3: Test All Content Types
1. **Text Content**:
   - Add new text
   - Edit existing text
   - Delete text
   
2. **Q&A Content**:
   - Add Q&A pairs
   - Edit Q&A
   - Delete Q&A
   
3. **Catalog Content**:
   - Add products
   - Update catalog
   - Delete products
   
4. **Website Content**:
   - Add URLs
   - Update instructions
   
5. **File Content**:
   - Upload files
   - Delete files

### Step 3.4: Test Search Functionality
Create a test endpoint or update chat to use Supabase search:

```typescript
import { searchKnowledgeSource } from '@/lib/vector-store-adapter';

const results = await searchKnowledgeSource(
  knowledgeSourceId,
  "test query",
  { limit: 5 }
);
```

## Phase 4: Migration

### Step 4.1: Add Migration Scripts to package.json
```json
{
  "scripts": {
    "migrate:vectors": "tsx scripts/migrate-to-supabase-vectors.ts",
    "migrate:vectors:dry": "tsx scripts/migrate-to-supabase-vectors.ts -- --dry-run"
  }
}
```

### Step 4.2: Test Migration with Dry Run
```bash
npm run migrate:vectors:dry
```
**Expected**: Shows what would be migrated without making changes

### Step 4.3: Migrate Test Sources
```bash
npm run migrate:vectors -- --source-id your-test-source-id
```

### Step 4.4: Verify Migration
- Check vector_documents table in Supabase
- Test search functionality
- Verify chat responses

### Step 4.5: Migrate All Sources
```bash
npm run migrate:vectors
```

## Phase 5: Full Deployment

### Step 5.1: Enable Feature Flag
```bash
# Update .env.local
USE_SUPABASE_VECTORS=true
```

### Step 5.2: Restart Application
```bash
npm run dev  # or your deployment command
```

### Step 5.3: Monitor & Test
- Monitor Edge Function logs
- Test all content operations
- Verify chat functionality

## Phase 6: Remove OpenAI Vector Dependencies

### Step 6.1: Update Knowledge Vector Integration
Replace all OpenAI vector calls with Supabase in `lib/knowledge-vector-integration.ts`.

### Step 6.2: Remove Vector Store File
After confirming everything works:
```bash
rm lib/vector-store.ts
```

### Step 6.3: Clean Up Imports
Remove any remaining imports of the old vector store.

### Step 6.4: Update Migration Endpoints
Update or remove:
- `app/api/knowledge-sources/vector-status/route.ts`
- `app/api/knowledge-sources/migrate-to-vector/route.ts`

## Phase 7: Final Cleanup & Commit

### Step 7.1: Clean Up Database
```sql
-- Optional: Remove OpenAI file IDs after confirming migration
UPDATE text_contents SET "openAIFileId" = NULL;
UPDATE qa_contents SET "openAIFileId" = NULL;
UPDATE catalog_contents SET "openAIFileId" = NULL;
```

### Step 7.2: Update Documentation
- Update README with new vector setup
- Document environment variables
- Add troubleshooting guide

### Step 7.3: Commit Changes
```bash
git add .
git commit -m "feat: Migrate from OpenAI to Supabase vector stores

- Implement LLM-agnostic vector storage using pgvector
- Add support for multiple embedding providers
- Create migration tools and documentation
- Maintain backward compatibility during transition
- Enable multi-LLM support for chatbots

BREAKING CHANGE: Requires Supabase with pgvector extension"

git push origin main
```

## Verification Checklist

- [ ] All content types create embeddings
- [ ] Search returns relevant results
- [ ] Chat uses vector search correctly
- [ ] No TypeScript errors
- [ ] Edge Function processes jobs
- [ ] Migration script works
- [ ] Feature flag controls behavior
- [ ] Old OpenAI code removed
- [ ] Documentation updated
- [ ] All tests pass

## Rollback Plan

If issues arise:
1. Set `USE_SUPABASE_VECTORS=false`
2. Restart application
3. System reverts to OpenAI vectors
4. Debug and fix issues
5. Try again

## Support Commands

### Check Vector Status
```sql
-- Check vector documents
SELECT COUNT(*) FROM vector_documents WHERE knowledge_source_id = 'xxx';

-- Check job status
SELECT * FROM embedding_job_status ORDER BY created_at DESC LIMIT 10;

-- Check which sources are migrated
SELECT id, name, supabase_vector_enabled FROM knowledge_sources;
```

### Monitor Edge Function
```bash
supabase functions logs process-embeddings --tail
```

### Force Reprocess Content
```sql
-- Queue a specific content for reprocessing
SELECT queue_embedding_generation(
  'knowledge-source-id',
  'text',
  'content-id',
  'Your content here',
  '{"userId": "user-id"}'::jsonb
);
``` 