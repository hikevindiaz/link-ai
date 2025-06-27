// @ts-nocheck
// This is a Supabase Edge Function that runs in Deno runtime
// The imports are valid for Deno but will show TypeScript errors in a Node.js environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

interface EmbeddingJob {
  job_id: string
  knowledge_source_id: string
  content_type: string
  content_id: string
  content: string
  metadata: Record<string, any>
}

interface EmbeddingConfig {
  provider: string
  model: string
  dimensions: number
}

serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Get batch of jobs from the request
    const jobs: EmbeddingJob[] = await req.json()
    
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as any[]
    }

    // Process each job
    for (const job of jobs) {
      try {
        // Get knowledge source configuration
        const { data: knowledgeSource } = await supabase
          .from('knowledge_sources')
          .select('embedding_provider, embedding_model, embedding_dimensions')
          .eq('id', job.knowledge_source_id)
          .single()

        const config: EmbeddingConfig = {
          provider: knowledgeSource?.embedding_provider || 'openai',
          model: knowledgeSource?.embedding_model || 'text-embedding-3-small',
          dimensions: knowledgeSource?.embedding_dimensions || 1536
        }

        // Generate embedding based on provider
        let embedding: number[]
        
        switch (config.provider) {
          case 'openai':
            const response = await openai.embeddings.create({
              model: config.model,
              input: job.content,
            })
            embedding = response.data[0].embedding
            break
          
          // Add other providers here as needed
          default:
            throw new Error(`Unsupported embedding provider: ${config.provider}`)
        }

        // Check if document already exists
        const { data: existingDoc } = await supabase
          .from('vector_documents')
          .select('id')
          .eq('knowledge_source_id', job.knowledge_source_id)
          .eq('content_type', job.content_type)
          .eq('content_id', job.content_id)
          .single()

        let vectorDocId: string

        if (existingDoc) {
          // Update existing document
          const { data, error } = await supabase
            .from('vector_documents')
            .update({
              content: job.content,
              embedding,
              metadata: job.metadata,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingDoc.id)
            .select('id')
            .single()

          if (error) throw error
          vectorDocId = data.id
        } else {
          // Insert new document
          const { data, error } = await supabase
            .from('vector_documents')
            .insert({
              knowledge_source_id: job.knowledge_source_id,
              content_type: job.content_type,
              content_id: job.content_id,
              content: job.content,
              embedding,
              metadata: job.metadata
            })
            .select('id')
            .single()

          if (error) throw error
          vectorDocId = data.id
        }

        // Update the content table with vector document ID
        const contentTable = `${job.content_type}_contents`
        await supabase
          .from(contentTable)
          .update({ vector_document_id: vectorDocId })
          .eq('id', job.content_id)

        // Update job status to completed
        await supabase
          .from('embedding_job_status')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.job_id)

        // Delete the job from the queue
        await supabase.rpc('pgmq_delete', {
          queue_name: 'embedding_jobs',
          msg_id: job.job_id
        })

        results.processed++
      } catch (error) {
        console.error(`Error processing job ${job.job_id}:`, error)
        
        // Update job status to failed
        await supabase
          .from('embedding_job_status')
          .update({ 
            status: 'failed',
            error_message: error.message,
            retry_count: supabase.sql`retry_count + 1`,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.job_id)

        results.failed++
        results.errors.push({
          job_id: job.job_id,
          error: error.message
        })
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Error in edge function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 