import { NextRequest, NextResponse } from 'next/server';
import { getElevenlabsCredentials } from '../credentials/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow for longer processing time

/**
 * Audio Isolation API endpoint that receives audio files and forwards them to ElevenLabs
 * to remove background noise
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
    const audioFile = formData.get('audio') as File | null;

    console.log('Received Audio Isolation request:', { 
      hasFile: !!audioFile, 
      fileType: audioFile?.type,
      fileSize: audioFile?.size,
      fileName: audioFile?.name
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
      console.log('Successfully read audio file for isolation:', { 
        byteLength: fileBytes.byteLength
      });
    } catch (error) {
      console.error('Error reading audio file for isolation:', error);
      return NextResponse.json(
        { error: 'Could not read audio file', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }

    // Get filename and type from the original file
    const filename = audioFile.name || 'audio.webm';
    const fileType = audioFile.type || 'audio/webm';

    // Convert to a proper Blob with original MIME type
    const audioBlob = new Blob([fileBytes], { type: fileType });
    
    // Prepare form data for ElevenLabs API
    const elevenlabsFormData = new FormData();
    elevenlabsFormData.append('audio', audioBlob, filename);
    
    // Add optional file format parameter based on the file extension
    let fileFormat = 'other';
    if (filename.endsWith('.mp3')) fileFormat = 'mp3';
    else if (filename.endsWith('.wav')) fileFormat = 'wav';
    else if (filename.endsWith('.webm')) fileFormat = 'webm';

    elevenlabsFormData.append('file_format', fileFormat);

    console.log('Sending to ElevenLabs Audio Isolation:', { 
      endpoint: 'https://api.elevenlabs.io/v1/audio-isolation/stream',
      blobSize: audioBlob.size
    });

    // Forward the request to ElevenLabs
    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/audio-isolation/stream', {
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
          console.error('ElevenLabs Audio Isolation API detailed error:', { 
            status: elevenlabsResponse.status,
            error: jsonError
          });
          
          return NextResponse.json(
            { 
              error: `ElevenLabs API error: ${elevenlabsResponse.status}`,
              details: jsonError
            },
            { status: elevenlabsResponse.status }
          );
        } catch (jsonParseError) {
          // Not JSON or invalid format, use the raw text
        }
      } catch (e) {
        errorDetails = 'Could not parse error response';
      }
      
      console.error('ElevenLabs Audio Isolation API error:', { 
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

    // Get the audio buffer directly
    const isolatedAudioBuffer = await elevenlabsResponse.arrayBuffer();
    
    // Return the isolated audio as a binary response
    return new NextResponse(isolatedAudioBuffer, {
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Length': isolatedAudioBuffer.byteLength.toString()
      }
    });
    
  } catch (error) {
    console.error('Error in Audio Isolation endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 