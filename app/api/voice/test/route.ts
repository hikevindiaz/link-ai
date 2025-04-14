import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API endpoint to test the voice service configuration
 * Tests connections to ElevenLabs and OpenAI APIs
 */
export async function GET() {
  try {
    // Get current user session for authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get API keys from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    // Check API key presence
    const keyStatus = {
      openai: !!openaiApiKey,
      elevenLabs: !!elevenLabsApiKey
    };
    
    const results = {
      keyStatus,
      tests: []
    };
    
    // Test ElevenLabs API if key is present
    if (elevenLabsApiKey) {
      try {
        // Basic test of ElevenLabs API - just check if we can get voices
        const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': elevenLabsApiKey
          }
        });
        
        const elevenLabsStatus = {
          name: 'ElevenLabs API',
          success: elevenLabsResponse.ok,
          status: elevenLabsResponse.status,
          statusText: elevenLabsResponse.statusText
        };
        
        results.tests.push(elevenLabsStatus);
      } catch (error) {
        results.tests.push({
          name: 'ElevenLabs API',
          success: false,
          error: error.message
        });
      }
    }
    
    // Test OpenAI API if key is present
    if (openaiApiKey) {
      try {
        // Basic test of OpenAI API - just check models
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`
          }
        });
        
        const openaiStatus = {
          name: 'OpenAI API',
          success: openaiResponse.ok,
          status: openaiResponse.status,
          statusText: openaiResponse.statusText
        };
        
        results.tests.push(openaiStatus);
      } catch (error) {
        results.tests.push({
          name: 'OpenAI API',
          success: false,
          error: error.message
        });
      }
    }
    
    // Return test results
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error testing voice services:', error);
    return NextResponse.json(
      { error: 'Failed to test voice services', details: error.message },
      { status: 500 }
    );
  }
} 