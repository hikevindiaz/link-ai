import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple API endpoint to check if OpenAI API key is configured
 */
export async function GET(req: NextRequest) {
  try {
    // Get the API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 401 }
      );
    }
    
    // Just check if key is present, don't actually verify with OpenAI
    // to avoid unnecessary API calls
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking OpenAI API key:', error);
    return NextResponse.json(
      { error: 'Error checking API key configuration' },
      { status: 500 }
    );
  }
} 