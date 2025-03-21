import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { chatbotSchema } from "@/lib/validations/chatbot";
import { z } from "zod";
import { fileTypes as codeFile } from "@/lib/validations/codeInterpreter";
import { fileTypes as searchFile } from "@/lib/validations/fileSearch";
import { getOpenAIKey, getModelNameFromId } from '@/lib/openai';

export const maxDuration = 300;

const routeContextSchema = z.object({
  params: z.object({
    chatbotId: z.string(),
  }),
})

// Use the global API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Simple function to verify if an assistant exists
async function verifyAssistant(openai: OpenAI, assistantId: string) {
  try {
    await openai.beta.assistants.retrieve(assistantId);
    return true;
  } catch (error) {
    console.error('Error verifying assistant:', error);
    return false;
  }
}

export async function GET(
  req: Request,
  { params }: { params: { chatbotId: string } }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatbotId = params.chatbotId;

    // Fetch the chatbot
    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: chatbotId,
        userId: session.user.id,
      },
      include: {
        model: true,
        knowledgeSources: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error("Error fetching chatbot:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatbotId = params.chatbotId;
    const body = await req.json();

    // Verify the chatbot exists and belongs to the user
    const existingChatbot = await prisma.chatbot.findUnique({
      where: {
        id: chatbotId,
        userId: session.user.id,
      },
    });

    if (!existingChatbot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Prepare update data, handling all possible fields including training-related fields
    const updateData: any = {};
    
    // Basic fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.prompt !== undefined) updateData.prompt = body.prompt;
    if (body.welcomeMessage !== undefined) updateData.welcomeMessage = body.welcomeMessage;
    if (body.chatbotErrorMessage !== undefined) updateData.chatbotErrorMessage = body.chatbotErrorMessage;
    if (body.modelId !== undefined) updateData.modelId = body.modelId;
    if (body.temperature !== undefined) updateData.temperature = body.temperature;
    if (body.maxPromptTokens !== undefined) updateData.maxPromptTokens = body.maxPromptTokens;
    if (body.maxCompletionTokens !== undefined) updateData.maxCompletionTokens = body.maxCompletionTokens;
    if (body.voice !== undefined) updateData.voice = body.voice;
    
    // Call tab fields
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber;
    if (body.responseRate !== undefined) updateData.responseRate = body.responseRate;
    if (body.checkUserPresence !== undefined) updateData.checkUserPresence = body.checkUserPresence;
    if (body.presenceMessage !== undefined) updateData.presenceMessage = body.presenceMessage;
    if (body.presenceMessageDelay !== undefined) updateData.presenceMessageDelay = body.presenceMessageDelay;
    if (body.silenceTimeout !== undefined) updateData.silenceTimeout = body.silenceTimeout;
    if (body.hangUpMessage !== undefined) updateData.hangUpMessage = body.hangUpMessage;
    if (body.callTimeout !== undefined) updateData.callTimeout = body.callTimeout;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.secondLanguage !== undefined) updateData.secondLanguage = body.secondLanguage;
    
    // Training-related fields
    if (body.trainingStatus !== undefined) updateData.trainingStatus = body.trainingStatus;
    if (body.trainingMessage !== undefined) updateData.trainingMessage = body.trainingMessage;
    if (body.lastTrainedAt !== undefined) updateData.lastTrainedAt = body.lastTrainedAt;

    // Handle knowledge sources if provided
    if (body.knowledgeSources !== undefined) {
      // First, disconnect all existing knowledge sources
      await prisma.chatbot.update({
        where: { id: chatbotId },
        data: {
          knowledgeSources: {
            disconnect: await prisma.knowledgeSource.findMany({
              where: {
                chatbots: {
                  some: {
                    id: chatbotId,
                  },
                },
              },
              select: {
                id: true,
              },
            }),
          },
        },
      });

      // Then, connect the new knowledge sources if any
      if (body.knowledgeSources.length > 0) {
        await prisma.chatbot.update({
          where: { id: chatbotId },
          data: {
            knowledgeSources: {
              connect: body.knowledgeSources.map((ks: any) => ({ id: ks.id })),
            },
          },
        });
      }
    }

    // Update the chatbot with the prepared data
    const updatedChatbot = await prisma.chatbot.update({
      where: { id: chatbotId },
      data: updateData,
      include: {
        model: true,
        knowledgeSources: true,
      },
    });

    return NextResponse.json(updatedChatbot);
  } catch (error) {
    console.error("Error updating chatbot:", error);
    return NextResponse.json(
      { error: "Failed to update chatbot" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: {
        id: params.chatbotId,
      },
    });

    if (!chatbot) {
      return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
    }

    if (chatbot.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the chatbot from the database
    await prisma.chatbot.delete({
      where: {
        id: params.chatbotId,
      },
    });

    // Initialize OpenAI client with the global API key
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Try to delete the assistant from OpenAI
    try {
      await openai.beta.assistants.del(chatbot.openaiId);
    } catch (error) {
      console.error('Error deleting assistant from OpenAI:', error);
      // Continue with the deletion even if the OpenAI deletion fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chatbot:', error);
    return NextResponse.json(
      { error: 'Failed to delete chatbot' },
      { status: 500 }
    );
  }
}