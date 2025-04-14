import { NextRequest, NextResponse } from 'next/server';
import { getElevenlabsCredentials } from '../credentials/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow for longer processing time

/**
 * Speech-to-Text API endpoint that receives audio files and forwards them to ElevenLabs
 */
export async function POST(req: NextRequest) {
  try {
    // Get the API key from credentials
    const { apiKey } = await getElevenlabsCredentials();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not available' },
        { status: 401 }
      );
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const audioFile = formData.get('file') as File | null;
    const modelId = formData.get('model_id') as string || 'scribe_v1';

    console.log('Received STT request:', { 
      hasFile: !!audioFile, 
      fileType: audioFile?.type,
      fileSize: audioFile?.size,
      name: audioFile?.name,
      modelId 
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
    
    // Prepare form data for ElevenLabs API
    const elevenlabsFormData = new FormData();
    elevenlabsFormData.append('file', audioBlob, filename);
    elevenlabsFormData.append('model_id', modelId);
    
    // Optional parameters
    if (formData.has('language_code')) {
      elevenlabsFormData.append('language_code', formData.get('language_code') as string);
    }

    // Add other parameters if needed
    elevenlabsFormData.append('tag_audio_events', 'true'); // Tag audio events
    elevenlabsFormData.append('diarize', 'false'); // No speaker diarization needed for single speaker

    console.log('Sending to ElevenLabs:', { 
      endpoint: 'https://api.elevenlabs.io/v1/speech-to-text',
      modelId,
      blobSize: audioBlob.size
    });

    // Forward the request to ElevenLabs
    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: elevenlabsFormData,
    });

    if (!elevenlabsResponse.ok) {
      let errorDetails;
      try {
        errorDetails = await elevenlabsResponse.text();
        
        // Parse the error response if it's in JSON format
        try {
          const jsonError = JSON.parse(errorDetails);
          if (jsonError.detail) {
            // Extract the specific error message from ElevenLabs format
            const status = jsonError.detail.status || 'unknown_error';
            const message = jsonError.detail.message || 'Unknown error';
            
            console.error('ElevenLabs STT API detailed error:', { 
              status: elevenlabsResponse.status,
              errorStatus: status,
              message 
            });
            
            return NextResponse.json(
              { 
                error: `ElevenLabs API error (${status}): ${message}`,
                details: jsonError
              },
              { status: elevenlabsResponse.status }
            );
          }
        } catch (jsonParseError) {
          // Not JSON or invalid format, use the raw text
        }
      } catch (e) {
        errorDetails = 'Could not parse error response';
      }
      
      console.error('ElevenLabs STT API error:', { 
        status: elevenlabsResponse.status, 
        details: errorDetails 
      });
      
      return NextResponse.json(
        { 
          error: `ElevenLabs API error: ${elevenlabsResponse.status}`,
          details: errorDetails
        },
        { status: elevenlabsResponse.status }
      );
    }

    // Return the transcription result
    const transcription = await elevenlabsResponse.json();
    console.log('Received transcription:', transcription);
    return NextResponse.json(transcription);
    
  } catch (error) {
    console.error('Error in STT endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 