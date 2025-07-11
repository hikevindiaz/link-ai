import { createClient } from '@supabase/supabase-js';

// Use environment variable for embedding model selection
// Auto-detect dimensions based on model
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

// Auto-detect dimensions based on the embedding model
function getEmbeddingDimensions(model: string): number {
  const envDimensions = process.env.EMBEDDING_DIMENSIONS;
  if (envDimensions) {
    return parseInt(envDimensions);
  }
  
  // Default dimensions for different models
  switch (model) {
    case 'text-embedding-ada-002':
      return 1536;
    case 'text-embedding-3-small':
      return 1536; // Match your working Edge Function configuration
    case 'text-embedding-3-large':
      return 3072;
    case 'gte-small':
      return 384; // Supabase's built-in gte-small model
    case 'gte-large':
      return 1024;
    default:
      return 1536; // Default to match your working system
  }
}

const EMBEDDING_DIMENSIONS = getEmbeddingDimensions(EMBEDDING_MODEL);

// Initialize Supabase client for vector operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface VectorSearchResult {
  id: string;
  knowledge_source_id: string;
  content_type: string;
  content_id: string;
  content: string;
  metadata: any;
  similarity: number;
}

export interface VectorSearchOptions {
  matchThreshold?: number;
  matchCount?: number;
  contentTypes?: string[] | null;
}

/**
 * Generate embedding for a query using OpenAI (to match your existing system)
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: query,
        dimensions: EMBEDDING_DIMENSIONS // This will be 1536 to match your working system
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('[VectorSearch] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Search vector documents across multiple knowledge sources
 */
export async function searchVectorDocuments(
  knowledgeSourceIds: string[],
  query: string,
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> {
  const {
    matchThreshold = 0.5,
    matchCount = 10,
    contentTypes = null
  } = options;

  // PERFORMANCE OPTIMIZATION: Start timing
  const searchStartTime = Date.now();

  try {
    console.log(`[VectorSearch] Starting search for ${knowledgeSourceIds.length} sources (${query.substring(0, 50)}...)`);

    // Generate embedding for the query
    const embeddingStartTime = Date.now();
    const queryEmbedding = await generateQueryEmbedding(query);
    console.log(`[VectorSearch] Embedding generated in ${Date.now() - embeddingStartTime}ms (${queryEmbedding.length} dims)`);

    // PERFORMANCE OPTIMIZATION: Use faster search with reduced match count for speed
    const dbStartTime = Date.now();
    const { data, error } = await supabase.rpc('match_vector_documents_multi_source', {
      query_embedding: queryEmbedding,
      source_ids: knowledgeSourceIds,
      match_threshold: matchThreshold,
      match_count: Math.min(matchCount, 5), // Reduce to max 5 for speed
      content_types: contentTypes
    });
    
    console.log(`[VectorSearch] Database query completed in ${Date.now() - dbStartTime}ms`);

    if (error) {
      console.error('[VectorSearch] Supabase RPC error:', error);
      
      // Check if it's a dimension mismatch error
      if (error.message?.includes('different vector dimensions')) {
        console.error('[VectorSearch] DIMENSION MISMATCH DETECTED!');
        console.error(`[VectorSearch] Query embedding: ${queryEmbedding.length} dimensions`);
        console.error(`[VectorSearch] Expected: ${EMBEDDING_DIMENSIONS} dimensions`);
        console.error('[VectorSearch] Tip: Check your EMBEDDING_MODEL and EMBEDDING_DIMENSIONS environment variables');
      }
      
      throw error;
    }

    const totalTime = Date.now() - searchStartTime;
    console.log(`[VectorSearch] TOTAL SEARCH TIME: ${totalTime}ms (found ${data?.length || 0} matches)`);
    
    // Debug: Also search with very low threshold to see what's available
    if (!data || data.length === 0) {
      console.log('[VectorSearch] Checking all results with low threshold for debugging...');
      const { data: debugData, error: debugError } = await supabase.rpc('match_vector_documents_multi_source', {
        query_embedding: queryEmbedding,
        source_ids: knowledgeSourceIds,
        match_threshold: 0.1, // Very low threshold for debugging
        match_count: 5, // Reduced for speed
        content_types: contentTypes
      });
      
      if (!debugError && debugData && debugData.length > 0) {
        console.log('[VectorSearch] DEBUG - All available matches:', debugData.map(match => ({
          similarity: match.similarity,
          content_type: match.content_type,
          content_preview: match.content.substring(0, 100) + '...'
        })));
        console.log(`[VectorSearch] DEBUG - Highest similarity: ${Math.max(...debugData.map(m => m.similarity))}`);
        console.log(`[VectorSearch] DEBUG - Average similarity: ${debugData.reduce((sum, m) => sum + m.similarity, 0) / debugData.length}`);
      }
    }
    
    // Debug: Log the actual results with similarity scores
    if (data && data.length > 0) {
      console.log('[VectorSearch] Match details:', data.map(match => ({
        similarity: match.similarity,
        content_type: match.content_type,
        content_preview: match.content.substring(0, 100) + '...'
      })));
      
      // PERFORMANCE LOG: Break down timing
      if (totalTime > 300) {
        console.warn(`[VectorSearch] SLOW SEARCH WARNING: ${totalTime}ms total (embedding: ${Date.now() - embeddingStartTime}ms, db: ${Date.now() - dbStartTime}ms)`);
      }
    } else {
      console.log('[VectorSearch] No matches found - threshold may be too high or embeddings not compatible');
    }
    
    return data || [];
  } catch (error) {
    const totalTime = Date.now() - searchStartTime;
    console.error(`[VectorSearch] Error after ${totalTime}ms:`, error);
    throw error;
  }
}

/**
 * Search vector documents within a single knowledge source
 */
export async function searchSingleKnowledgeSource(
  knowledgeSourceId: string,
  query: string,
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> {
  const {
    matchThreshold = 0.5,
    matchCount = 10,
    contentTypes = null
  } = options;

  try {
    console.log(`[VectorSearch] Searching knowledge source ${knowledgeSourceId} for: "${query.substring(0, 100)}..."`);
    console.log(`[VectorSearch] Using model: ${EMBEDDING_MODEL}, dimensions: ${EMBEDDING_DIMENSIONS}`);

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    console.log(`[VectorSearch] Generated query embedding with ${queryEmbedding.length} dimensions`);

    // Use the single-source search function
    const { data, error } = await supabase.rpc('match_vector_documents', {
      query_embedding: queryEmbedding,
      source_id: knowledgeSourceId,
      match_threshold: matchThreshold,
      match_count: matchCount,
      content_types: contentTypes
    });

    if (error) {
      console.error('[VectorSearch] Supabase RPC error:', error);
      
      // Check if it's a dimension mismatch error
      if (error.message?.includes('different vector dimensions')) {
        console.error('[VectorSearch] DIMENSION MISMATCH DETECTED!');
        console.error(`[VectorSearch] Query embedding: ${queryEmbedding.length} dimensions`);
        console.error(`[VectorSearch] Expected: ${EMBEDDING_DIMENSIONS} dimensions`);
        console.error('[VectorSearch] Tip: Check your EMBEDDING_MODEL and EMBEDDING_DIMENSIONS environment variables');
      }
      
      throw error;
    }

    console.log(`[VectorSearch] Found ${data?.length || 0} vector matches`);
    return data || [];
  } catch (error) {
    console.error('[VectorSearch] Error searching vector documents:', error);
    throw error;
  }
}

/**
 * Format vector search results for use in AI prompts
 */
export function formatVectorResultsForPrompt(results: VectorSearchResult[]): string {
  if (!results || results.length === 0) {
    return '';
  }

  const formattedResults = results.map((result, index) => {
    const metadata = result.metadata || {};
    const sourceInfo = metadata.source || `${result.content_type}:${result.content_id}`;
    
    // Add content type description for clarity
    const contentTypeLabel = {
      'qa': 'Q&A Pair',
      'file': 'Document/File',
      'website': 'Website Content', 
      'text': 'Text Content',
      'catalog': 'Catalog Item'
    }[result.content_type] || result.content_type;
    
    return `--- ${contentTypeLabel} ${index + 1} (${sourceInfo}, similarity: ${result.similarity.toFixed(3)}) ---
${result.content}`;
  }).join('\n\n');

  return `🔥 CRITICAL: PRIORITIZE KNOWLEDGE BASE OVER GENERAL KNOWLEDGE 🔥

MANDATORY INSTRUCTIONS:
1. The following content is from your verified knowledge base (documents, Q&A, files, websites, etc.)
2. ALWAYS prioritize and use this knowledge base content as your PRIMARY source
3. If the user's question relates to ANY of this content, base your response on this information
4. For Q&A content: Use the factual information provided, but adapt the tone and style to match your personality
5. For document/file content: Extract and use the relevant information, presenting it in your unique voice
6. For website content: Reference the specific information found, but deliver it in your conversational style
7. Only supplement with general knowledge if the knowledge base content is insufficient
8. Do NOT replace knowledge base information with general responses

KNOWLEDGE BASE CONTENT:
${formattedResults}

🔥 END CRITICAL KNOWLEDGE BASE CONTENT 🔥

RESPONSE STRATEGY:
- PRIMARY: Use knowledge base content above as your main information source
- PERSONALITY: Adapt the delivery to match your unique tone, style, and personality while keeping facts accurate
- ACCURACY: Maintain factual correctness from the knowledge base, but express it naturally in your voice
- ENGAGEMENT: Make responses feel conversational and authentic to your character
- SECONDARY: Only add general knowledge if knowledge base content doesn't fully answer the question
- FALLBACK: If this knowledge base content doesn't answer the user's question, still provide a helpful response using general knowledge, and mention you can help with business-specific questions`;
}

/**
 * Check if knowledge sources have vector content
 */
export async function checkKnowledgeSourcesHaveVectors(knowledgeSourceIds: string[]): Promise<{[key: string]: boolean}> {
  const results: {[key: string]: boolean} = {};

  try {
    for (const sourceId of knowledgeSourceIds) {
      const { data, error } = await supabase
        .from('vector_documents')
        .select('id')
        .eq('knowledge_source_id', sourceId)
        .limit(1);

      if (error) {
        console.warn(`[VectorSearch] Error checking vectors for ${sourceId}:`, error);
        results[sourceId] = false;
      } else {
        results[sourceId] = (data && data.length > 0);
      }
    }

    return results;
  } catch (error) {
    console.error('[VectorSearch] Error checking knowledge source vectors:', error);
    // Return false for all sources on error
    return knowledgeSourceIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
  }
} 