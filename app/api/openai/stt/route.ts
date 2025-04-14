import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow for longer processing time

/**
 * Speech-to-Text API endpoint that receives audio files and forwards them to OpenAI's Whisper API
 */
export async function POST(req: NextRequest) {
  try {
    // Get the API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not available' },
        { status: 401 }
      );
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const audioFile = formData.get('file') as File | null;
    const model = formData.get('model') as string || 'gpt-4o-mini-transcribe';

    console.log('Received OpenAI STT request:', { 
      hasFile: !!audioFile, 
      fileType: audioFile?.type,
      fileSize: audioFile?.size,
      name: audioFile?.name,
      model 
    });

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // For debugging - check if we can read the file
    let fileBytes;
    try {
      fileBytes = await audioFile.arrayBuffer();
      console.log('Successfully read audio file:', { 
        byteLength: fileBytes.byteLength,
        slice: new Uint8Array(fileBytes.slice(0, 16)) // First few bytes for debugging
      });
    } catch (error) {
      console.error('Error reading audio file:', error);
      return NextResponse.json(
        { error: 'Could not read audio file', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }

    // Get filename and type from the original file
    const filename = audioFile.name || 'audio.webm';
    const fileType = audioFile.type || 'audio/webm';

    // Convert to a proper Blob with the original MIME type
    const audioBlob = new Blob([fileBytes], { type: fileType });
    
    // Prepare form data for OpenAI API
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioBlob, filename);
    openaiFormData.append('model', model);
    
    // Optional parameters
    if (formData.has('response_format')) {
      openaiFormData.append('response_format', formData.get('response_format') as string);
    } else {
      openaiFormData.append('response_format', 'json'); // Default to JSON response
    }

    if (formData.has('prompt')) {
      openaiFormData.append('prompt', formData.get('prompt') as string);
    }

    if (formData.has('language')) {
      openaiFormData.append('language', formData.get('language') as string);
    }

    console.log('Sending to OpenAI Whisper API:', { 
      endpoint: 'https://api.openai.com/v1/audio/transcriptions',
      model,
      blobSize: audioBlob.size
    });

    // Forward the request to OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openaiFormData,
    });

    if (!openaiResponse.ok) {
      let errorDetails;
      try {
        errorDetails = await openaiResponse.text();
        
        // Parse the error response if it's in JSON format
        try {
          const jsonError = JSON.parse(errorDetails);
          console.error('OpenAI STT API detailed error:', { 
            status: openaiResponse.status,
            error: jsonError 
          });
          
          return NextResponse.json(
            { 
              error: `OpenAI API error: ${jsonError.error?.message || 'Unknown error'}`,
              details: jsonError
            },
            { status: openaiResponse.status }
          );
        } catch (jsonParseError) {
          // Not JSON or invalid format, use the raw text
        }
      } catch (e) {
        errorDetails = 'Could not parse error response';
      }
      
      console.error('OpenAI STT API error:', { 
        status: openaiResponse.status, 
        details: errorDetails 
      });
      
      return NextResponse.json(
        { 
          error: `OpenAI API error: ${openaiResponse.status}`,
          details: errorDetails
        },
        { status: openaiResponse.status }
      );
    }

    // Return the transcription result
    const transcription = await openaiResponse.json();
    console.log('Received transcription:', transcription);
    return NextResponse.json(transcription);
    
  } catch (error) {
    console.error('Error in OpenAI STT endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 