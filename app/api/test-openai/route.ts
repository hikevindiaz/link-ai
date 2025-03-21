import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    // Get the API key from environment variables
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key is not configured");
      return NextResponse.json({
        success: false,
        message: "OpenAI API key is not configured in environment variables",
      }, { status: 500 });
    }

    // Create a new OpenAI client with the global API key
    const client = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Test the OpenAI API with a simple completion
    console.log("Testing OpenAI API...");
    
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say 'The OpenAI API is working correctly.'" }
        ],
        max_tokens: 50
      });
      
      const response = completion.choices[0]?.message?.content || "No response";
      
      return NextResponse.json({
        success: true,
        message: "OpenAI API is working correctly",
        response: response,
        model: completion.model,
        usage: completion.usage
      });
    } catch (apiError) {
      console.error("OpenAI API error:", apiError);
      
      return NextResponse.json({
        success: false,
        message: "Error while testing OpenAI API",
        error: apiError instanceof Error ? apiError.message : String(apiError),
        details: apiError
      }, { status: 500 });
    }
  } catch (error) {
    console.error("OpenAI API test error:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to test OpenAI API",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
} 