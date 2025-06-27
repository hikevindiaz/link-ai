# Clean LLM-Agnostic Vector Implementation

## Overview
This is a **pure Supabase vector store implementation** with no OpenAI dependencies. The system is completely LLM-agnostic and uses open-source embedding models running in Supabase Edge Functions.

## Key Components

### 1. Vector Service (`lib/vector-service.ts`)
- Clean, simple API for vector operations
- Supports all content types: text, Q&A, catalog, website, files
- Three main operations:
  - `processContent()` - Generate embeddings and store
  - `searchContent()` - Semantic search
  - `deleteContent()` - Remove from vector store

### 2. Database Schema
- **Removed all OpenAI fields**:
  - No more `vectorStoreId`
  - No more `openAIFileId`
  - No more `supabaseVectorEnabled` toggle
- **Clean embedding configuration** in `KnowledgeSource`:
  - `embeddingProvider` (default: 'supabase')
  - `embeddingModel` (default: 'gte-small')
  - `embeddingDimensions` (default: 384)

### 3. Supabase Infrastructure
- **Extensions**: pgvector, pg_cron, pg_net, pgmq
- **Tables**: 
  - `vector_documents` - Central vector storage
  - `embedding_job_status` - Async job tracking
- **Functions**:
  - `match_vector_documents` - Semantic search
  - `search_all_sources` - Multi-source search

### 4. Edge Function (`supabase/functions/generate-embeddings`)
- Processes embedding jobs asynchronously
- Currently using placeholder embeddings (ready for model integration)
- No external API dependencies

## API Routes Updated
All knowledge source API routes now use the clean vector service:
- `/api/knowledge-sources/[sourceId]/text-content`
- `/api/knowledge-sources/[sourceId]/qa`
- `/api/knowledge-sources/[sourceId]/catalog/products`
- `/api/knowledge-sources/[sourceId]/content`
- `/api/knowledge-sources/[sourceId]/upload`

## Benefits
1. **No vendor lock-in** - Completely independent of OpenAI
2. **Cost effective** - No per-query API costs
3. **Privacy focused** - All embeddings generated locally
4. **Flexible** - Easy to swap embedding models
5. **Simple** - Clean, straightforward implementation

## Next Steps
1. Integrate real embedding model in Edge Function (e.g., gte-small)
2. Update agent runtime to use vector search
3. Add embedding model configuration UI
4. Performance optimization for large-scale deployments 