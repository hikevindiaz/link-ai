import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

import { chatbotSchema } from "@/lib/validations/chatbot";
import OpenAI from "openai";
import { getUserSubscriptionPlan } from "@/lib/subscription";
import { RequiresHigherPlanError } from "@/lib/exceptions";
import { fileTypes as codeFile } from "@/lib/validations/codeInterpreter";
import { fileTypes as searchFile } from "@/lib/validations/fileSearch";

// Add the global OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get all chatbots for the current user
    const chatbots = await prisma.chatbot.findMany({
      where: {
        userId,
      },
      include: {
        twilioPhoneNumber: {
          select: {
            id: true,
            phoneNumber: true,
          },
        },
      },
    });
    
    // Format chatbots for the frontend
    const formattedChatbots = chatbots.map((chatbot) => ({
      id: chatbot.id,
      name: chatbot.name,
      phoneNumber: chatbot.twilioPhoneNumber?.id || null,
    }));
    
    return NextResponse.json({ 
      success: true,
      chatbots: formattedChatbots
    });
  } catch (error) {
    console.error('Error fetching chatbots:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      chatbots: [] // Ensure chatbots is always defined
    }, { status: 500 });
  }
}

// Define the types for the tools to fix the linter errors
type ToolResources = {
  code_interpreter: {
    file_ids: string[];
  };
  file_search: {
    vector_store_ids: string[];
  };
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Get or create the gpt-4o-mini model
    const modelName = "gpt-4.1-mini-2025-04-14";
    let model = await prisma.chatbotModel.findFirst({
      where: {
        name: modelName,
      },
    });

    // If the model doesn't exist, create it
    if (!model) {
      model = await prisma.chatbotModel.create({
        data: {
          name: modelName,
        },
      });
    }

    // Create the chatbot with default values for new fields
    const chatbot = await prisma.chatbot.create({
      data: {
        name: body.name,
        userId: session.user.id,
        prompt: body.prompt || "You are a helpful assistant.",
        welcomeMessage: body.welcomeMessage || "Hello! How can I help you today?",
        chatbotErrorMessage: body.chatbotErrorMessage || "I'm sorry, I encountered an error. Please try again later.",
        temperature: body.temperature || 0.7,
        maxPromptTokens: body.maxPromptTokens || 1200,
        maxCompletionTokens: body.maxCompletionTokens || 1200,
        // Set modelId using the actual model ID from the database
        modelId: model.id,
        // Initialize training-related fields with default values
        trainingStatus: "idle",
        trainingMessage: null,
        lastTrainedAt: null,
      },
    });

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error("Error creating chatbot:", error);
    return NextResponse.json(
      { error: "Failed to create chatbot" },
      { status: 500 }
    );
  }
}
