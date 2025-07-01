/**
 * Simplified Vector Service - Clean, scalable embedding processing
 * Direct text processing + Tika service for files
 * VERSION: 2.1 - TESTING MODULE RELOAD
 */

import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

// Test export to verify module loading
export const VECTOR_SERVICE_VERSION = "2.2-PRODUCTION-READY";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface VectorContent {
  content: string;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  contentTypes?: string[];
}

/**
 * Main processing function - simplified flow with better race condition handling
 * VERSION: 2.2 (Fixed job detection and processing)
 */
export async function processContentV2(
  knowledgeSourceId: string,
  contentId: string,
  contentType: 'text' | 'qa' | 'file' | 'catalog' | 'website',
  data: VectorContent
): Promise<string | null> {
  console.log(`[processContentV2] 🔍 PROCESSING ${contentType.toUpperCase()} CONTENT ${contentId}`);
  console.log(`[processContentV2] 📋 Data:`, {
    contentLength: data.content?.length || 0,
    hasMetadata: !!data.metadata,
    metadata: data.metadata
  });
  
  try {
    // Get knowledge source for validation
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id: knowledgeSourceId }
    });

    if (!knowledgeSource) {
      throw new Error('Knowledge source not found');
    }

    // STEP 1: Check if there's already a completed vector document
    console.log(`[processContentV2] 🔍 STEP 1: Checking for existing vector document: ${knowledgeSourceId}/${contentType}/${contentId}`);
    
    const { data: existingVector, error: checkError } = await supabase
      .from('vector_documents')
      .select('id, created_at')
      .eq('knowledge_source_id', knowledgeSourceId)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`[processContentV2] ❌ Error checking for existing vector:`, checkError);
    }

    if (existingVector) {
      console.log(`[processContentV2] ✅ EARLY EXIT: Vector document already exists for ${contentType}:${contentId} (created: ${existingVector.created_at}), skipping`);
      return null; // Already processed
    }

    console.log(`[processContentV2] ✅ STEP 1 PASSED: No existing vector document found`);

    // STEP 2: Check for active embedding jobs (pending or processing only)
    console.log(`[processContentV2] 🔍 STEP 2: Checking for active embedding jobs...`);
    const existingJobs = await prisma.$queryRaw`
      SELECT job_id, status, created_at, error
      FROM embedding_jobs 
      WHERE knowledge_source_id = ${knowledgeSourceId}
      AND content_type = ${contentType}
      AND content_id = ${contentId}
      AND status IN ('pending', 'processing')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (Array.isArray(existingJobs) && existingJobs.length > 0) {
      const existingJob = existingJobs[0] as { job_id: string; status: string; created_at: Date; error?: string };
      console.log(`[processContentV2] ✅ EARLY EXIT: Found existing ${existingJob.status} embedding job: ${existingJob.job_id}, will retry processing`);
      
      // If job is pending, try to trigger processing again
      if (existingJob.status === 'pending') {
        console.log(`[processContentV2] 🔄 Retriggering processing for pending job: ${existingJob.job_id}`);
        try {
          await processEmbedding(existingJob.job_id);
          console.log(`[processContentV2] ✅ Successfully retriggered processing for job: ${existingJob.job_id}`);
        } catch (processError) {
          console.warn(`[processContentV2] ⚠️ Failed to retrigger processing for job ${existingJob.job_id}:`, processError);
        }
      }
      
      return existingJob.job_id;
    }

    console.log(`[processContentV2] ✅ STEP 2 PASSED: No active jobs found`);

    // STEP 3: Clean up any failed jobs before creating new one
    console.log(`[processContentV2] 🧹 STEP 3: Cleaning up failed jobs...`);
    await supabase
      .from('embedding_jobs')
      .delete()
      .eq('knowledge_source_id', knowledgeSourceId)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .eq('status', 'failed');

    console.log(`[processContentV2] ✅ STEP 3 COMPLETE: Ready to create new embedding job`);

    let content: string;

    // Handle different content types
    console.log(`[processContentV2] 🔄 STEP 4: Processing content for type: ${contentType}`);
    if (contentType === 'file' && !data.content) {
      // Files without pre-extracted content: Will be handled by edge function
      content = `File: ${data.metadata?.fileName || 'Unknown file'}`;
      console.log(`[processContentV2] 📁 File content will be extracted by edge function`);
    } else {
      // Direct text processing for text/qa/catalog/website, or files with pre-extracted content
      content = await formatContentForProcessing(contentType, data);
      console.log(`[processContentV2] 📝 Formatted content: ${content.length} characters`);
    }

    if (!content || content.trim().length === 0) {
      console.error(`[processContentV2] ❌ FATAL ERROR: No content to process!`);
      console.error(`[processContentV2] 📋 Debug info:`, {
        contentType,
        originalContent: data.content,
        processedContent: content,
        metadata: data.metadata
      });
      throw new Error('No content to process');
    }

    console.log(`[processContentV2] ✅ STEP 4 COMPLETE: Content ready for processing (${content.length} chars)`);

    // Create embedding job with atomic operation
    console.log(`[processContentV2] 🚀 STEP 5: Creating embedding job...`);
    const jobId = await createEmbeddingJobAtomic(
      knowledgeSourceId,
      contentType,
      contentId,
      content,
      data.metadata || {}
    );

    console.log(`[processContentV2] 🎉 SUCCESS: Created embedding job: ${jobId}`);
    return jobId;
  } catch (error) {
    console.error(`[processContentV2] ❌ FATAL ERROR processing ${contentType}:${contentId}:`, error);
    throw error;
  }
}

/**
 * Extract text from file using Tika service
 */
async function extractTextFromFile(data: VectorContent): Promise<string> {
  const { storageUrl, mimeType, fileName } = data.metadata || {};

  if (!storageUrl) {
    throw new Error('File storage URL required for text extraction');
      }

  try {
    console.log(`[extractTextFromFile] Processing file: ${fileName}`);
    
    // Download file from Supabase storage
    const fileResponse = await fetch(storageUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.status}`);
    }
    
    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Send to Tika service
    const tikaUrl = process.env.TIKA_URL || 'https://linkai-tika-service.fly.dev';
    console.log(`[extractTextFromFile] Sending to Tika: ${tikaUrl}`);
    
    const tikaResponse = await fetch(`${tikaUrl}/tika`, {
      method: 'PUT',
            headers: {
        'Content-Type': mimeType || 'application/octet-stream',
        'Accept': 'text/plain'
            },
      body: fileBuffer,
          });
          
    if (!tikaResponse.ok) {
      const errorText = await tikaResponse.text();
      throw new Error(`Tika extraction failed: ${tikaResponse.status} - ${errorText}`);
    }

    const extractedText = await tikaResponse.text();
    console.log(`[extractTextFromFile] Extracted ${extractedText.length} characters`);
    
    // Update file record with extracted text
    if (data.metadata?.fileId) {
      try {
        console.log(`[extractTextFromFile] Updating file record ${data.metadata.fileId} with extracted text`);
        await prisma.file.update({
          where: { id: data.metadata.fileId },
          data: { extractedText }
        });
        console.log(`[extractTextFromFile] Successfully updated file record with extracted text`);
      } catch (updateError) {
        console.error(`[extractTextFromFile] Failed to update file record:`, updateError);
        // Don't throw - we can continue without updating the file record
      }
          }
    
    return extractedText;
        } catch (error) {
    console.error('[extractTextFromFile] Error:', error);
    // Return filename as fallback
    return `File: ${fileName || 'Unknown file'}`;
        }
      }
      
/**
 * Format content for direct processing (text, qa, catalog, website)
 */
async function formatContentForProcessing(
  contentType: 'text' | 'qa' | 'file' | 'catalog' | 'website',
  data: VectorContent
): Promise<string> {
  switch (contentType) {
    case 'text':
      return data.content || '';

    case 'file':
      // For files, we already have the extracted text in data.content
      const fileName = data.metadata?.fileName || 'Unknown file';
      const fileContent = data.content || '';
      return fileContent ? `File: ${fileName}\n\n${fileContent}` : `File: ${fileName}`;

    case 'qa':
      const { question, answer } = data.metadata || {};
      return `Q: ${question || ''}\nA: ${answer || ''}`;

    case 'catalog':
      const { instructions, products } = data.metadata || {};
      let catalogContent = instructions || '';
      if (products && Array.isArray(products)) {
        catalogContent += '\n\nProducts:\n' + products.map((p: any) => {
          let productInfo = `- ${p.title || p.name}: ${p.description || ''} (Price: $${p.price || 'N/A'})`;
          if (p.imageUrl) {
            productInfo += ` [Image: ${p.imageUrl}]`;
          }
          if (p.categories && p.categories.length > 0) {
            productInfo += ` [Categories: ${p.categories.join(', ')}]`;
          }
          return productInfo;
        }).join('\n');
      }
      return catalogContent;

    case 'website':
      return data.content || `Website: ${data.metadata?.url || ''}`;

    default:
      return data.content || '';
  }
}

/**
 * Create embedding job in database with improved deduplication
 * Fixed to work with actual database structure: embedding_jobs + vector_documents
 */
/**
 * Atomic embedding job creation with maximum duplicate prevention
 * This is the production-ready version that prevents race conditions
 */
async function createEmbeddingJobAtomic(
  knowledgeSourceId: string,
  contentType: string,
  contentId: string,
  content: string,
  metadata: Record<string, any>
): Promise<string> {
  console.log(`[createEmbeddingJobAtomic] Creating job for ${contentType}:${contentId}`);
  
  try {
    // Use a single atomic operation with upsert to prevent duplicates
    const { data: job, error } = await supabase
      .from('embedding_jobs')
      .upsert({
        knowledge_source_id: knowledgeSourceId,
        content_type: contentType,
        content_id: contentId,
        content: content.substring(0, 8000), // Limit content size
        metadata,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'knowledge_source_id,content_type,content_id',
        ignoreDuplicates: false // We want to update if exists
      })
      .select('job_id, status')
      .single();

    if (error) {
      console.error(`[createEmbeddingJobAtomic] Upsert error:`, error);
      throw new Error(`Failed to create/update embedding job: ${error.message}`);
    }

    console.log(`[createEmbeddingJobAtomic] Job upserted:`, job.job_id, `(${job.status})`);

    // Only trigger processing if the job is pending (newly created or reset)
    if (job.status === 'pending') {
      try {
        console.log(`[createEmbeddingJobAtomic] Triggering immediate processing for job ${job.job_id}`);
        await processEmbedding(job.job_id);
        console.log(`[createEmbeddingJobAtomic] Immediate processing triggered for job ${job.job_id}`);
      } catch (processError) {
        console.warn(`[createEmbeddingJobAtomic] Immediate processing failed for job ${job.job_id}, job will be picked up by cron:`, processError);
      }
    } else {
      console.log(`[createEmbeddingJobAtomic] Job ${job.job_id} already in status ${job.status}, not triggering processing`);
    }
    
    return job.job_id;
    
  } catch (error) {
    console.error(`[createEmbeddingJobAtomic] Error:`, error);
    throw error;
  }
}

/**
 * Process embedding via edge function with improved error handling
 */
async function processEmbedding(jobId: string): Promise<void> {
  console.log(`[processEmbedding] Starting immediate processing for job: ${jobId}`);
  
  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration (URL or Service Key)');
    }

    console.log(`[processEmbedding] Calling edge function: ${supabaseUrl}/functions/v1/generate-embeddings`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_id: jobId })
    });

    const responseText = await response.text();
    console.log(`[processEmbedding] Edge function response (${response.status}):`, responseText);

    if (!response.ok) {
      console.error(`[processEmbedding] Immediate processing failed for ${jobId}: ${response.status} - ${responseText}`);
      // Mark job as failed if it's a permanent error
      if (response.status === 401 || response.status === 403) {
        await supabase
          .from('embedding_jobs')
          .update({ 
            status: 'failed', 
            error: `Authentication error: ${response.status} - ${responseText}`,
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);
        throw new Error(`Authentication error: ${response.status}`);
      }
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    } else {
      console.log(`[processEmbedding] Successfully triggered processing for ${jobId}`);
      
      // Parse response to check if processing was successful
      try {
        const result = JSON.parse(responseText);
        if (result.success) {
          console.log(`[processEmbedding] Edge function confirmed success for ${jobId}`);
        } else {
          console.warn(`[processEmbedding] Edge function reported processing issue for ${jobId}:`, result);
        }
      } catch (parseError) {
        console.log(`[processEmbedding] Edge function response was not JSON, but status was OK`);
      }
    }
  } catch (error) {
    console.error(`[processEmbedding] Processing error for ${jobId}:`, error);
    
    // Update job status to failed if it's a permanent error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    try {
      await supabase
        .from('embedding_jobs')
        .update({ 
          status: 'failed', 
          error: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId);
    } catch (updateError) {
      console.error(`[processEmbedding] Failed to update job status:`, updateError);
    }
    
    throw error;
  }
}

/**
 * Search content using vector similarity
 */
export async function searchContent(
  knowledgeSourceId: string,
  query: string,
  options: SearchOptions = {}
): Promise<any[]> {
  const { limit = 10, threshold = 0.5, contentTypes } = options;

  try {
    console.log(`[searchContent] Searching: "${query.substring(0, 100)}..."`);

    // Generate query embedding directly
    const queryEmbedding = await generateQueryEmbedding(query);

    // Search for similar documents
    const { data, error } = await supabase.rpc('match_vector_documents', {
      query_embedding: queryEmbedding,
      source_id: knowledgeSourceId,
      match_threshold: threshold,
      match_count: limit,
      content_types: contentTypes || null
    });

    if (error) {
      throw error;
    }

    console.log(`[searchContent] Found ${data?.length || 0} matches`);
    return data || [];
  } catch (error) {
    console.error('[searchContent] Error:', error);
    throw error;
  }
}

/**
 * Generate embedding for search query using OpenAI (to match existing system)
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
      dimensions: 1536 // Match your working Edge Function configuration
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Delete content from vector store
 */
export async function deleteContent(
  knowledgeSourceId: string,
  contentType: 'text' | 'qa' | 'file' | 'catalog' | 'website',
  contentId: string
): Promise<void> {
  console.log(`[deleteContent] Deleting ${contentType} content ${contentId}`);
  
  try {
    // Delete from vector_documents table
    const { error: vectorError } = await supabase
      .from('vector_documents')
      .delete()
      .eq('knowledge_source_id', knowledgeSourceId)
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    if (vectorError) {
      console.error('[deleteContent] Error deleting vector documents:', vectorError);
    }

    // Delete any pending embedding jobs
    const { error: jobError } = await supabase
      .from('embedding_jobs')
      .delete()
      .eq('knowledge_source_id', knowledgeSourceId)
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    if (jobError) {
      console.error('[deleteContent] Error deleting embedding jobs:', jobError);
    }

    console.log(`[deleteContent] Successfully deleted ${contentType} content ${contentId}`);
  } catch (error) {
    console.error('[deleteContent] Error:', error);
    throw error;
  }
}

/**
 * Process file content (simplified)
 */
export async function processFileContent(
  knowledgeSourceId: string,
  contentId: string,
  storageUrl: string,
  metadata?: any
): Promise<void> {
  console.log(`[processFileContent] Processing file: ${storageUrl}`);
  
  await processContentV2(knowledgeSourceId, contentId, 'file', {
    content: '', // Will be extracted from file
    metadata: {
      ...metadata,
      storageUrl
    }
  });
}

/**
 * Update catalog content vectors
 */
export async function updateCatalogVector(
  knowledgeSourceId: string,
  catalogContentId: string
): Promise<void> {
  console.log(`[updateCatalogVector] Updating catalog ${catalogContentId}`);
  
  const catalogContent = await prisma.catalogContent.findUnique({
    where: { id: catalogContentId },
    include: { products: true }
  });

  if (!catalogContent) {
    throw new Error('Catalog content not found');
  }

  // STEP 1: Delete existing vector documents to force re-processing
  console.log(`[updateCatalogVector] Deleting existing vectors for catalog ${catalogContentId} before update`);
  await deleteContent(knowledgeSourceId, 'catalog', catalogContentId);

  // STEP 2: Process updated catalog content
  await processContentV2(knowledgeSourceId, catalogContentId, 'catalog', {
    content: '', // Will be formatted in formatContentForProcessing
    metadata: {
      instructions: catalogContent.instructions,
      products: catalogContent.products,
      productCount: catalogContent.products.length
    }
  });
}

// Backward compatibility exports
export function formatContent(
  contentType: 'text' | 'qa' | 'file' | 'catalog' | 'website',
  data: any
): VectorContent {
  return {
    content: data.content || JSON.stringify(data),
    metadata: data
  };
}

export async function queueEmbeddingJob(
  jobId: string,
  immediate: boolean = true
): Promise<{ success: boolean; processed?: boolean; error?: string }> {
  // Simplified - just try to process immediately
  try {
    await processEmbedding(jobId);
          return { success: true, processed: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 