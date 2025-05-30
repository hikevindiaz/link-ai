import { ElevenLabsClient } from 'elevenlabs';
import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';
import { Readable } from 'stream';

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

// Initialize storage client - we'll use this to store audio files
// This requires appropriate credentials setup
let storage: Storage | null = null;

try {
  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    storage = new Storage({ credentials });
  }
} catch (error) {
  console.error('Failed to initialize Google Cloud Storage:', error);
}

const bucketName = process.env.GOOGLE_CLOUD_BUCKET || 'linkai-audio-files';
const expirationTimeMinutes = 10; // Audio URLs will expire after this time

/**
 * Generate speech using ElevenLabs and return a publicly accessible URL
 * 
 * @param text Text to convert to speech
 * @param voiceId ElevenLabs voice ID to use
 * @returns URL to the audio file
 */
export async function generateSpeechUrl(text: string, voiceId: string): Promise<string> {
  try {
    // Generate a unique filename
    const filename = `${crypto.randomUUID()}.mp3`;
    
    // Use the ElevenLabs API to convert text to speech
    const audioStream = await elevenlabs.textToSpeech.convert(
      voiceId,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }
    );
    
    // Convert stream to buffer if needed
    const audioBuffer = await streamToBuffer(audioStream);
    
    // If we have storage configured, upload to Google Cloud Storage
    if (storage) {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(`twilio-calls/${filename}`);
      
      await file.save(audioBuffer, {
        metadata: {
          contentType: 'audio/mpeg',
        },
      });
      
      // Generate a signed URL that will expire after the specified time
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expirationTimeMinutes * 60 * 1000,
      });
      
      return url;
    } else {
      // If no cloud storage is configured, use a fallback method
      // In a real production environment, you'd need to implement this
      throw new Error('No storage provider configured');
    }
  } catch (error) {
    console.error('Error generating speech URL:', error);
    throw error;
  }
}

/**
 * A simpler implementation that doesn't require Google Cloud Storage
 * Returns the audio as a Buffer that can be handled directly
 */
export async function generateSpeech(text: string, voiceId: string): Promise<Buffer> {
  try {
    // Use the ElevenLabs API to convert text to speech
    const audioStream = await elevenlabs.textToSpeech.convert(
      voiceId,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }
    );
    
    // Convert stream to buffer
    return await streamToBuffer(audioStream);
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
}

/**
 * Helper function to convert a stream to a buffer
 */
async function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    // Handle both Readable streams and direct Buffers
    if (Buffer.isBuffer(stream)) {
      resolve(stream);
    } else if (typeof stream?.pipe === 'function') {
      // It's a stream
      stream.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    } else {
      reject(new Error('Input is neither a Buffer nor a Readable stream'));
    }
  });
} 