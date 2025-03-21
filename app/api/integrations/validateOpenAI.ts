import { NextResponse } from "next/server";
import axios from "axios";
import { isOpenAIConfigured } from "@/lib/openai";

export async function GET() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, message: "Global OpenAI API key is not configured." },
      { status: 500 }
    );
  }

  try {
    // Test the global API key by fetching available models
    const response = await axios.get("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });

    if (response.status === 200) {
      return NextResponse.json(
        { success: true, message: "OpenAI integration is active and working." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Invalid OpenAI API key configuration." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to validate OpenAI integration." },
      { status: 500 }
    );
  }
}
