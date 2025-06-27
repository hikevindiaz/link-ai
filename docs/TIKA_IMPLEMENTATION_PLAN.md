# Apache Tika + Tesseract Implementation Plan

## Overview
Implement robust file text extraction using Apache Tika + Tesseract OCR deployed on Fly.io to enhance the existing vector store system.

## Phase 1: Tika Service Deployment (1-2 hours)

### 1.1 Create Tika Service Directory
```bash
mkdir tika-service
cd tika-service
```

### 1.2 Dockerfile
```dockerfile
FROM openjdk:11-jre-slim

# Install Tesseract for OCR + additional language support
RUN apt-get update \
  && apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa \
     libtesseract-dev \
  && rm -rf /var/lib/apt/lists/*

# Fetch and install Tika Server
ENV TIKA_VERSION=2.9.0
ADD https://downloads.apache.org/tika/tika-server-${TIKA_VERSION}.jar /tika-server.jar

# Expose the default port
EXPOSE 9998

# Launch Tika in server mode with OCR enabled
ENTRYPOINT ["java", "-jar", "/tika-server.jar", "-h", "0.0.0.0", "--enableUnsecureFeatures", "--ocrLanguage=eng+spa"]
```

### 1.3 fly.toml Configuration
```toml
app = "linkai-tika"
kill_signal = "SIGINT"
kill_timeout = 30
primary_region = "iad"  # Match your Supabase region

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 9998
  protocol = "tcp"
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  
  [[services.ports]]
    port = 80
    handlers = ["http"]
    
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[env]
  JAVA_OPTS = "-Xmx2g -server"
```

### 1.4 Deploy to Fly.io
```bash
flyctl auth login
flyctl launch --name linkai-tika --region iad
flyctl deploy
```

## Phase 2: Edge Function Enhancement (30 minutes)

### 2.1 Add Text Extraction to Edge Function

Add this function to `supabase/functions/generate-embeddings/index.ts`:

```typescript
// Add at the top with other functions
async function extractTextFromFile(
  supabase: any, 
  bucketName: string, 
  filePath: string, 
  mimeType: string
): Promise<string> {
  try {
    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath)
    
    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`)
    }
    
    // Convert to buffer
    const buffer = await fileData.arrayBuffer()
    
    // Call Tika service
    const tikaUrl = Deno.env.get('TIKA_URL') || 'https://linkai-tika.fly.dev'
    const tikaResponse = await fetch(`${tikaUrl}/tika`, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: buffer,
    })
    
    if (!tikaResponse.ok) {
      throw new Error(`Tika extraction failed: ${tikaResponse.status}`)
    }
    
    return await tikaResponse.text()
  } catch (error) {
    console.error('Text extraction error:', error)
    // Fallback to filename if extraction fails
    return `File: ${filePath.split('/').pop()}`
  }
}
```

### 2.2 Modify Job Processing Logic

Update the job processing section:

```typescript
// In the job processing loop, before generating embeddings:
let content = jobDetails.content

// Handle file content extraction
if (jobDetails.content_type === 'file' && jobDetails.metadata?.is_storage_file) {
  const bucketName = jobDetails.metadata.bucket_name || 'files'
  const filePath = jobDetails.metadata.file_path || jobDetails.content
  const mimeType = jobDetails.metadata.mime_type || 'application/octet-stream'
  
  console.log(`Extracting text from file: ${filePath}`)
  content = await extractTextFromFile(supabase, bucketName, filePath, mimeType)
  
  // Update the file record with extracted text
  if (content && content.length > 10) {
    await supabase
      .from('files')
      .update({ extractedText: content })
      .eq('id', jobDetails.content_id)
  }
}

if (!content || content.trim().length === 0) {
  throw new Error('No content to embed after extraction')
}
```

## Phase 3: Environment Configuration (5 minutes)

### 3.1 Set Supabase Secrets
```bash
supabase secrets set TIKA_URL=https://linkai-tika.fly.dev
```

### 3.2 Test the Service
```bash
# Test Tika service directly
curl -X PUT -H "Content-Type: application/pdf" \
  --data-binary @test.pdf \
  https://linkai-tika.fly.dev/tika
```

## Phase 4: Testing & Verification (15 minutes)

### 4.1 Test Different File Types
- Upload a PDF with text
- Upload a DOCX file  
- Upload a scanned PDF (OCR test)
- Upload a CSV file

### 4.2 Verify Vector Generation
Check that:
1. `extractedText` field is populated in files table
2. Vector documents contain actual text content
3. RAG queries return relevant results from file content

## Benefits of This Approach

### ✅ **Advantages**
- **Robust**: Handles complex PDFs, tables, multi-column layouts
- **OCR Support**: Extracts text from scanned documents and images
- **Production Ready**: Apache Tika is battle-tested in enterprise environments
- **Cost Effective**: Only runs when processing files (auto-scale to zero)
- **Maintenance**: Minimal - just a Docker container
- **Quality**: Superior text extraction vs. pure JS libraries

### ⚠️ **Considerations**
- **Additional Service**: One more piece of infrastructure
- **Cost**: ~$5-15/month on Fly.io (scales to zero when not in use)
- **Latency**: +200-500ms per file for text extraction
- **Dependencies**: Requires Java/Tika maintenance

## Alternative: Pure Edge Function Approach

If you prefer to avoid additional infrastructure, we could implement:

```typescript
// Basic text extraction in Edge Function
async function extractTextBasic(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') {
    return new TextDecoder().decode(buffer)
  }
  
  if (mimeType === 'text/csv') {
    return new TextDecoder().decode(buffer)
  }
  
  // For PDFs, DOCX, etc. - would need additional libraries
  // This approach has significant limitations
  return 'Content extraction not supported for this file type'
}
```

**But this has major limitations:**
- No PDF text extraction
- No DOCX support
- No OCR capabilities
- Poor handling of complex layouts

## Recommendation

**Go with Tika on Fly.io** because:
1. You already have Fly.io infrastructure
2. Superior quality is worth the small operational overhead
3. RAG systems need high-quality text extraction to be effective
4. Your users expect files to actually work in their knowledge base

The implementation is straightforward and the quality improvement is substantial. 