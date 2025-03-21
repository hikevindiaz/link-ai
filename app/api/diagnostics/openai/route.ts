import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        message: "OpenAI API key is not configured in environment variables",
      }, { status: 500 });
    }

    // Create a new OpenAI client with the global API key
    const client = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Test the API key by listing models
    const models = await client.models.list();
    
    // Test the assistants API
    const assistants = await client.beta.assistants.list({
      limit: 1,
    });

    return NextResponse.json({
      success: true,
      message: "OpenAI API connection successful",
      models: models.data.slice(0, 5).map(model => model.id),
      assistantsApiWorking: assistants.data.length >= 0,
    });
  } catch (error) {
    console.error("OpenAI API diagnostic error:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to connect to OpenAI API",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
} 