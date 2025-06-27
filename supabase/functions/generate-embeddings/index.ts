// @ts-nocheck
// Supabase Edge Function for Production-Ready Embedding Generation
// Version 2.2 - Fixed file processing flow with better error handling

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let requestBody = null;
  let job_id = null;

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase configuration')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Supabase configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('❌ Missing OpenAI API key')
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request with better error handling
    try {
      const bodyText = await req.text()
      console.log(`📥 Received request body: ${bodyText}`)
      
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({ success: false, error: 'Empty request body' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      requestBody = JSON.parse(bodyText)
      
      // Handle both single job_id format and jobs array format
      if (requestBody.job_id) {
        // Single job format (new system)
        job_id = requestBody.job_id
      } else if (requestBody.jobs && Array.isArray(requestBody.jobs)) {
        // Jobs array format (legacy/batch system)
        console.log(`📋 Received jobs array with ${requestBody.jobs.length} jobs`)
        
        // Find the first valid job with a non-null job_id
        const validJob = requestBody.jobs.find(job => job && job.job_id)
        if (validJob) {
          job_id = validJob.job_id
          console.log(`🎯 Processing first valid job: ${job_id}`)
        } else {
          console.error('❌ No valid jobs found in array:', requestBody.jobs)
          return new Response(
            JSON.stringify({ success: false, error: 'No valid jobs found in array' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      } else {
        console.error('❌ No job_id or jobs array found in request:', requestBody)
        return new Response(
          JSON.stringify({ success: false, error: 'Missing job_id or jobs array' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    if (!job_id) {
      console.error('❌ Missing job_id in request:', requestBody)
      return new Response(
        JSON.stringify({ success: false, error: 'Missing job_id parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🚀 Processing embedding job: ${job_id}`)

    // Step 1: Get embedding job details
    const { data: job, error: jobError } = await supabase
      .from('embedding_jobs')
      .select('*')
      .eq('job_id', job_id)
      .single()

    if (jobError || !job) {
      console.error(`❌ Job not found: ${job_id}`, jobError)
      return new Response(
        JSON.stringify({ success: false, error: `Job not found: ${job_id}` }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📄 Job details: ${job.content_type} for source ${job.knowledge_source_id}`)

    // Step 2: Update job status to processing
    await supabase
      .from('embedding_jobs')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('job_id', job_id)

    let textContent = job.content || ''

    // Step 3: Handle file content extraction if needed
    if (job.content_type === 'file' && job.metadata?.storageUrl) {
      console.log(`📁 Extracting text from file: ${job.metadata.fileName}`)
      
      try {
        // Download file from Supabase storage
        console.log(`⬇️ Downloading file from: ${job.metadata.storageUrl}`)
        const fileResponse = await fetch(job.metadata.storageUrl)
        
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`)
        }
        
        const fileBuffer = await fileResponse.arrayBuffer()
        console.log(`📊 Downloaded ${fileBuffer.byteLength} bytes`)
        
        // Extract text using Tika service
        const tikaUrl = Deno.env.get('TIKA_URL') || 'https://linkai-tika-service.fly.dev'
        console.log(`🔍 Extracting text via Tika: ${tikaUrl}`)
        
        const tikaResponse = await fetch(`${tikaUrl}/tika`, {
          method: 'PUT',
          headers: {
            'Content-Type': job.metadata.mimeType || 'application/octet-stream',
            'Accept': 'text/plain'
          },
          body: fileBuffer
        })
        
        if (!tikaResponse.ok) {
          const errorText = await tikaResponse.text()
          throw new Error(`Tika extraction failed: ${tikaResponse.status} - ${errorText}`)
        }
        
        const extractedText = await tikaResponse.text()
        console.log(`✅ Extracted ${extractedText.length} characters of text`)
        
        // Update the job content with extracted text
        textContent = `File: ${job.metadata.fileName}\n\n${extractedText}`
        
        // Also update the file record in the database if fileId is available
        if (job.metadata.fileId) {
          console.log(`💾 Updating file record ${job.metadata.fileId} with extracted text`)
          const { error: updateError } = await supabase
            .from('files')
            .update({ extractedText })
            .eq('id', job.metadata.fileId)
            
          if (updateError) {
            console.warn(`⚠️ Failed to update file record:`, updateError)
          } else {
            console.log(`✅ File record updated successfully`)
          }
        }
        
      } catch (extractError) {
        console.error(`❌ Text extraction failed:`, extractError)
        textContent = `File: ${job.metadata.fileName}\n\nText extraction failed: ${extractError.message}`
      }
    }

    // Step 4: Generate embeddings
    if (!textContent || textContent.trim().length === 0) {
      throw new Error('No content available for embedding generation')
    }

    console.log(`🧠 Generating embeddings for ${textContent.length} characters`)
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: textContent.substring(0, 8000), // Limit content size
        dimensions: 1536
      }),
    })

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text()
      throw new Error(`OpenAI API error: ${embeddingResponse.status} - ${errorText}`)
    }

    const embeddingData = await embeddingResponse.json()
    const embedding = embeddingData.data[0].embedding

    console.log(`✅ Generated ${embedding.length}-dimensional embedding`)

    // Step 5: Store vector document atomically
    const { data: vectorDoc, error: vectorError } = await supabase
      .from('vector_documents')
      .upsert({
        knowledge_source_id: job.knowledge_source_id,
        content_type: job.content_type,
        content_id: job.content_id,
        content: textContent,
        embedding,
        metadata: job.metadata || {}
      }, {
        onConflict: 'knowledge_source_id,content_type,content_id'
      })
      .select('id')
      .single()

    if (vectorError) {
      throw new Error(`Failed to store vector document: ${vectorError.message}`)
    }

    console.log(`💾 Stored vector document: ${vectorDoc.id}`)

    // Step 6: Mark job as completed
    await supabase
      .from('embedding_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('job_id', job_id)

    console.log(`🎉 Successfully completed embedding job: ${job_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id,
        vector_document_id: vectorDoc.id,
        content_length: textContent.length,
        message: 'Embedding generated and stored successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error processing embedding job:', error)
    
    // Try to mark the job as failed if we have the job_id
    if (job_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        await supabase
          .from('embedding_jobs')
          .update({ 
            status: 'failed',
            error: error.message || 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('job_id', job_id)
        
        console.log(`📝 Marked job ${job_id} as failed`)
      } catch (updateError) {
        console.error('❌ Failed to update job status:', updateError)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error',
        job_id: job_id || 'unknown'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 