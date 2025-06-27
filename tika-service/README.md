# LinkAI Tika Service

Apache Tika server with Tesseract OCR for robust file text extraction.

## Features

- **PDF Text Extraction**: Handles complex layouts, tables, multi-column documents
- **OCR Support**: Extracts text from scanned documents and images
- **Multiple Formats**: PDF, DOCX, DOC, XLS, XLSX, CSV, TXT, HTML
- **Language Support**: English and Spanish OCR
- **Auto-scaling**: Scales to zero when not in use

## Deployment

```bash
# Login to Fly.io
flyctl auth login

# Deploy the service
flyctl launch --name linkai-tika --region iad
flyctl deploy

# Check status
flyctl status
```

## Testing

```bash
# Test with a PDF file
curl -X PUT -H "Content-Type: application/pdf" \
  --data-binary @test.pdf \
  https://linkai-tika.fly.dev/tika

# Test with a DOCX file
curl -X PUT -H "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  --data-binary @test.docx \
  https://linkai-tika.fly.dev/tika

# Get metadata
curl -X PUT -H "Content-Type: application/pdf" \
  --data-binary @test.pdf \
  https://linkai-tika.fly.dev/meta
```

## Usage in Edge Function

```typescript
async function extractTextFromFile(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  const response = await fetch('https://linkai-tika.fly.dev/tika', {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: buffer,
  })
  
  if (!response.ok) {
    throw new Error(`Tika extraction failed: ${response.status}`)
  }
  
  return await response.text()
}
```

## Supported MIME Types

- `application/pdf` - PDF documents
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - DOCX
- `application/msword` - DOC
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` - XLSX
- `application/vnd.ms-excel` - XLS
- `text/csv` - CSV files
- `text/plain` - Text files
- `text/html` - HTML files

## Cost

- **Idle**: $0 (auto-scales to zero)
- **Active**: ~$0.01-0.03 per hour when processing files
- **Monthly**: ~$5-15 depending on usage 