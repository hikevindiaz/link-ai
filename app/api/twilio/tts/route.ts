import { NextRequest, NextResponse } from 'next/server';
import { generateSpeech } from '@/lib/elevenlabs';

// Runtime configuration for this route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Text-to-speech endpoint that generates ElevenLabs audio on demand
 * and serves it to Twilio as MP3 audio
 * 
 * Query parameters:
 * - message: The text to convert to speech
 * - voice: The ElevenLabs voice ID to use
 */
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const message = url.searchParams.get('message');
    const voice = url.searchParams.get('voice');
    
    // Validate required parameters
    if (!message) {
      return NextResponse.json(
        { error: 'Missing message parameter' },
        { status: 400 }
      );
    }
    
    if (!voice) {
      return NextResponse.json(
        { error: 'Missing voice parameter' },
        { status: 400 }
      );
    }
    
    console.log(`Generating TTS for message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" with voice: ${voice}`);
    
    // Generate speech using ElevenLabs
    const audioBuffer = await generateSpeech(message, voice);
    
    // Return the audio as MP3
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
      }
    });
  } catch (error) {
    console.error('Error generating TTS:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
} 