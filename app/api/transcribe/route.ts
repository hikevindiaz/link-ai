import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

/**
 * API route to transcribe audio using OpenAI Whisper API
 */
export async function POST(request: Request) {
  try {
    // Log request
    console.log('[Transcribe API] Received transcription request');
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Save form data to temporary file
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;
    
    if (!audioFile) {
      console.log('[Transcribe API] No audio file provided');
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Get file size for logging
    console.log('[Transcribe API] File size:', audioFile.size);
    
    // Use a temp file to store the audio data
    const tempFilePath = path.join(os.tmpdir(), `speech-${Date.now()}.webm`);
    
    try {
      // Write the audio file to disk
      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(tempFilePath, buffer);
      
      console.log(`[Transcribe API] Saved audio to ${tempFilePath}`);
      
      // Send to OpenAI for transcription
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: 'en',
      });
      
      // Delete the temp file
      fs.unlinkSync(tempFilePath);
      
      console.log('[Transcribe API] Transcription successful:', transcription.text);
      return NextResponse.json({
        text: transcription.text,
        success: true,
      });
    } catch (error) {
      console.error('[Transcribe API] Error during transcription:', error);
      
      // Try to clean up the temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {
        console.error('[Transcribe API] Error deleting temp file:', e);
      }
      
      return NextResponse.json(
        { error: 'Transcription failed', details: String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Transcribe API] Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: String(error) },
      { status: 500 }
    );
  }
} 