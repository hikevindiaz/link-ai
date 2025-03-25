import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { OpenAI } from 'openai';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the knowledge source
    const knowledgeSource = await db.knowledgeSource.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        textContents: true,
        qaContents: true,
        websiteContents: true,
        catalogContents: {
          include: {
            products: true,
          },
        },
        files: true,
        chatbots: {
          include: {
            model: true,
          },
        },
      },
    });

    if (!knowledgeSource) {
      return NextResponse.json({ error: "Knowledge source not found" }, { status: 404 });
    }

    // Parse training options from request body
    const body = await req.json();
    const trainingOptions = {
      forceRetrain: body.forceRetrain || false,
      optimizeForSpeed: body.optimizeForSpeed !== false, // Default to true
    };

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Process the knowledge source content
    let combinedContent = "";
    
    // Add text content
    if (knowledgeSource.textContents.length > 0) {
      combinedContent += "# Text Content\n\n";
      knowledgeSource.textContents.forEach((tc, index) => {
        combinedContent += `## Text Content ${index + 1}\n\n${tc.content}\n\n`;
      });
    }
    
    // Add Q&A pairs
    if (knowledgeSource.qaContents.length > 0) {
      combinedContent += "# Q&A Pairs\n\n";
      knowledgeSource.qaContents.forEach((qa, index) => {
        combinedContent += `## Q&A Pair ${index + 1}\n\nQuestion: ${qa.question}\n\nAnswer: ${qa.answer}\n\n`;
      });
    }
    
    // Add website content
    if (knowledgeSource.websiteContents.length > 0) {
      combinedContent += "# Website Content\n\n";
      knowledgeSource.websiteContents.forEach((wc, index) => {
        combinedContent += `## Website ${index + 1}\n\nURL: ${wc.url}\n\n`;
      });
    }

    // Create a file for the knowledge source
    let fileId: string | undefined;
    if (combinedContent.trim()) {
      const file = await openai.files.create({
        file: new File([combinedContent], "knowledge-source.md", { type: "text/markdown" }),
        purpose: "assistants",
      });
      
      fileId = file.id;
    }

    // Update each assigned chatbot
    const updatePromises = knowledgeSource.chatbots.map(async (chatbot) => {
      try {
        // Get existing files for this chatbot
        const existingFiles = await db.chatbotFiles.findMany({
          where: {
            chatbotId: chatbot.id,
          },
          include: {
            file: true,
          },
        });

        // Create a map of knowledge source IDs to their last updated times
        const knowledgeSourceLastUpdated = new Map();
        knowledgeSourceLastUpdated.set(knowledgeSource.id, knowledgeSource.updatedAt);

        // Determine which files can be reused
        let reusableFiles: any[] = [];
        if (!trainingOptions.forceRetrain) {
          reusableFiles = existingFiles.filter((cf) => {
            const ksId = cf.file.knowledgeSourceId;
            if (!ksId) return false;
            
            const lastUpdated = knowledgeSourceLastUpdated.get(ksId);
            if (!lastUpdated) return false;
            
            return new Date(cf.file.createdAt) > new Date(lastUpdated);
          });
        }

        // Delete existing files that won't be reused
        const filesToDelete = existingFiles.filter(
          (cf) => !reusableFiles.includes(cf)
        );
        
        if (filesToDelete.length > 0) {
          // Delete the chatbot files associations
          await db.chatbotFiles.deleteMany({
            where: {
              id: {
                in: filesToDelete.map((cf) => cf.id),
              },
            },
          });
          
          // Delete the OpenAI files
          for (const cf of filesToDelete) {
            try {
              await openai.files.del(cf.file.openAIFileId);
            } catch (error) {
              console.log(`Error deleting file ${cf.file.openAIFileId}: ${error}`);
            }
          }
        }

        // Get the reusable file IDs
        const reusableFileIds = reusableFiles.map((cf) => cf.file.openAIFileId);
        const fileIds = [...reusableFileIds];

        // Add the new file if it exists
        if (fileId) {
          fileIds.push(fileId);
        }

        // Create or update the assistant
        let assistantId = chatbot.openaiId;
        let assistantExists = false;

        if (assistantId) {
          try {
            await openai.beta.assistants.retrieve(assistantId);
            assistantExists = true;
          } catch (error) {
            console.log(`Assistant not found or error retrieving: ${error}`);
            assistantExists = false;
          }
        }

        const modelName = chatbot.model?.name || "gpt-4";
        const instructions = chatbot.prompt || "";

        if (assistantExists) {
          try {
            const assistant = await openai.beta.assistants.update(assistantId, {
              name: chatbot.name,
              instructions,
              model: modelName,
              tools: [],
              metadata: { fileIds: JSON.stringify(fileIds) },
            });
            assistantId = assistant.id;
          } catch (error) {
            console.error(`Error updating assistant: ${error}`);
            // If updating fails, create a new assistant
            const assistant = await openai.beta.assistants.create({
              name: chatbot.name,
              instructions,
              model: modelName,
              tools: [],
              metadata: { fileIds: JSON.stringify(fileIds) },
            });
            assistantId = assistant.id;
          }
        } else {
          const assistant = await openai.beta.assistants.create({
            name: chatbot.name,
            instructions,
            model: modelName,
            tools: [],
            metadata: { fileIds: JSON.stringify(fileIds) },
          });
          assistantId = assistant.id;
        }

        // Update the chatbot with the training results
        await db.chatbot.update({
          where: {
            id: chatbot.id,
          },
          data: {
            openaiId: assistantId,
            trainingStatus: "success",
            trainingMessage: "Training completed successfully",
            lastTrainedAt: new Date(),
          },
        });

        return { success: true, chatbotId: chatbot.id };
      } catch (error) {
        console.error(`Error updating chatbot ${chatbot.id}:`, error);
        return { success: false, chatbotId: chatbot.id, error };
      }
    });

    // Wait for all chatbot updates to complete
    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter(r => r.success).length;
    const failedUpdates = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Training completed. Successfully updated ${successfulUpdates} agent${successfulUpdates !== 1 ? 's' : ''}${failedUpdates > 0 ? `, ${failedUpdates} failed` : ''}.`,
      results,
    });
  } catch (error) {
    console.error("Error training knowledge source:", error);
    return NextResponse.json(
      { error: "Failed to train knowledge source" },
      { status: 500 }
    );
  }
} 