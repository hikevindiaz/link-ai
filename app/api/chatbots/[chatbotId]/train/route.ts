import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import OpenAI from "openai";

export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: { chatbotId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the chatbot
    const chatbot = await db.chatbot.findUnique({
      where: {
        id: params.chatbotId,
        userId: session.user.id,
      },
      include: {
        model: true,
        knowledgeSources: {
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
          },
        },
      },
    });

    if (!chatbot) {
      console.log("Chatbot not found");
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Parse training options from request body
    const body = await req.json();
    const trainingOptions = {
      forceRetrain: body.forceRetrain || false,
      optimizeForSpeed: body.optimizeForSpeed !== false, // Default to true
    };
    
    console.log("Training options:", trainingOptions);

    // Update the chatbot's training status to "training"
    await db.chatbot.update({
      where: {
        id: params.chatbotId,
      },
      data: {
        trainingStatus: "training",
        trainingMessage: "Training in progress...",
      },
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Check if the assistant already exists
    let assistantId = chatbot.openaiId || "";
    let assistantExists = false;

    if (assistantId) {
      try {
        await openai.beta.assistants.retrieve(assistantId);
        assistantExists = true;
        console.log(`Assistant exists with ID: ${assistantId}`);
      } catch (error) {
        console.log(`Assistant not found or error retrieving: ${error}`);
        assistantExists = false;
      }
    }

    // Get the model name
    const modelName = chatbot.model?.name || "gpt-4o";

    // Process knowledge sources
    const knowledgeSources = chatbot.knowledgeSources || [];
    console.log(`Processing ${knowledgeSources.length} knowledge sources`);

    // Check for existing files in the database
    const existingFiles = await db.chatbotFiles.findMany({
      where: {
        chatbotId: params.chatbotId,
      },
      include: {
        file: true,
      },
    });

    console.log(`Found ${existingFiles.length} existing files`);

    // Create a map of knowledge source IDs to their last updated times
    const knowledgeSourceLastUpdated = new Map();
    knowledgeSources.forEach((ks) => {
      knowledgeSourceLastUpdated.set(ks.id, ks.updatedAt);
    });

    // Determine which files can be reused
    let reusableFiles: any[] = [];
    if (!trainingOptions.forceRetrain) {
      reusableFiles = existingFiles.filter((cf) => {
        const ksId = cf.file.knowledgeSourceId;
        if (!ksId) return false;
        
        const lastUpdated = knowledgeSourceLastUpdated.get(ksId);
        if (!lastUpdated) return false;
        
        // If the file was created after the knowledge source was last updated,
        // we can reuse it
        return new Date(cf.file.createdAt) > new Date(lastUpdated);
      });
    }

    console.log(`Reusing ${reusableFiles.length} files`);

    // Delete existing files that won't be reused
    const filesToDelete = existingFiles.filter(
      (cf) => !reusableFiles.includes(cf)
    );
    
    if (filesToDelete.length > 0) {
      console.log(`Deleting ${filesToDelete.length} existing files`);
      
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

    // Process each knowledge source
    const fileIds: string[] = [...reusableFileIds];
    
    for (const ks of knowledgeSources) {
      // Skip knowledge sources that have already been processed
      if (reusableFiles.some((cf) => cf.file.knowledgeSourceId === ks.id)) {
        console.log(`Skipping already processed knowledge source: ${ks.name}`);
        continue;
      }
      
      console.log(`Processing knowledge source: ${ks.name}`);
      
      // Process text content
      const textContents = ks.textContents || [];
      console.log(`Found ${textContents.length} text contents`);
      
      // Process Q&A pairs
      const qaContents = ks.qaContents || [];
      console.log(`Found ${qaContents.length} Q&A pairs`);
      
      // Process website content
      const websiteContents = ks.websiteContents || [];
      console.log(`Found ${websiteContents.length} website contents`);
      
      // Process catalog content
      const catalogContents = ks.catalogContents || [];
      console.log(`Found ${catalogContents.length} catalog contents`);
      
      // Process files
      const files = ks.files || [];
      console.log(`Found ${files.length} files`);
      
      // Create a combined file for the knowledge source
      let combinedContent = "";
      
      // Add text content
      if (textContents.length > 0) {
        combinedContent += "# Text Content\n\n";
        textContents.forEach((tc, index) => {
          combinedContent += `## Text Content ${index + 1}\n\n${tc.content}\n\n`;
        });
      }
      
      // Add Q&A pairs
      if (qaContents.length > 0) {
        combinedContent += "# Q&A Pairs\n\n";
        qaContents.forEach((qa, index) => {
          combinedContent += `## Q&A Pair ${index + 1}\n\nQuestion: ${qa.question}\n\nAnswer: ${qa.answer}\n\n`;
        });
      }
      
      // Add website content
      if (websiteContents.length > 0) {
        combinedContent += "# Website Content\n\n";
        websiteContents.forEach((wc, index) => {
          combinedContent += `## Website ${index + 1}\n\nURL: ${wc.url}\n\n`;
        });
      }
      
      // Add catalog content
      if (catalogContents.length > 0) {
        combinedContent += "# Catalog Content\n\n";
        catalogContents.forEach((cc, index) => {
          combinedContent += `## Catalog ${index + 1}\n\n`;
          
          if (cc.instructions) {
            combinedContent += `Instructions: ${cc.instructions}\n\n`;
          }
          
          if (cc.products && cc.products.length > 0) {
            combinedContent += "Products:\n\n";
            cc.products.forEach((product, pIndex) => {
              combinedContent += `### Product ${pIndex + 1}: ${product.title}\n\n`;
              combinedContent += `Description: ${product.description || "N/A"}\n\n`;
              combinedContent += `Price: ${product.price}\n\n`;
              combinedContent += `Categories: ${product.categories.join(", ")}\n\n`;
            });
          }
        });
      }
      
      // If we have combined content, create a file
      if (combinedContent.trim()) {
        try {
          // Use advanced processing if optimizeForSpeed is false
          if (!trainingOptions.optimizeForSpeed) {
            // Process text with chunking for better retrieval
            const file = await openai.files.create({
              file: new Blob([combinedContent], { type: "text/markdown" }),
              purpose: "assistants",
            });
            
            // Create a file record in the database
            const dbFile = await db.file.create({
              data: {
                userId: session.user.id,
                name: `${ks.name} - Combined Content`,
                openAIFileId: file.id,
                blobUrl: "",
                knowledgeSourceId: ks.id,
              },
            });
            
            // Associate the file with the chatbot
            await db.chatbotFiles.create({
              data: {
                chatbotId: params.chatbotId,
                fileId: dbFile.id,
              },
            });
            
            fileIds.push(file.id);
          } else {
            // Simple processing for speed
            const file = await openai.files.create({
              file: new Blob([combinedContent], { type: "text/markdown" }),
              purpose: "assistants",
            });
            
            // Create a file record in the database
            const dbFile = await db.file.create({
              data: {
                userId: session.user.id,
                name: `${ks.name} - Combined Content`,
                openAIFileId: file.id,
                blobUrl: "",
                knowledgeSourceId: ks.id,
              },
            });
            
            // Associate the file with the chatbot
            await db.chatbotFiles.create({
              data: {
                chatbotId: params.chatbotId,
                fileId: dbFile.id,
              },
            });
            
            fileIds.push(file.id);
          }
        } catch (error) {
          console.error(`Error processing combined content: ${error}`);
        }
      }
      
      // Upload existing files to OpenAI
      for (const file of files) {
        try {
          // Check if the file is already in OpenAI
          const existingFile = await db.file.findUnique({
            where: {
              id: file.id,
            },
          });
          
          if (existingFile && existingFile.openAIFileId) {
            // Associate the file with the chatbot
            await db.chatbotFiles.create({
              data: {
                chatbotId: params.chatbotId,
                fileId: existingFile.id,
              },
            });
            
            fileIds.push(existingFile.openAIFileId);
          }
        } catch (error) {
          console.error(`Error processing file: ${error}`);
        }
      }
    }

    // Prepare instructions for the assistant
    const instructions = chatbot.prompt || "You are a helpful assistant.";

    // Create or update the assistant
    if (assistantExists) {
      console.log(`Updating assistant with ID: ${assistantId}`);
      
      try {
        const assistant = await openai.beta.assistants.update(assistantId, {
          name: chatbot.name,
          instructions,
          model: modelName,
          file_ids: fileIds,
        });
        
        console.log(`Updated assistant with ID: ${assistant.id}`);
        assistantId = assistant.id;
      } catch (error) {
        console.error(`Error updating assistant: ${error}`);
        
        // If updating fails, try to create a new assistant
        console.log("Creating new assistant instead");
        
        const assistant = await openai.beta.assistants.create({
          name: chatbot.name,
          instructions,
          model: modelName,
          file_ids: fileIds,
        });
        
        console.log(`Created new assistant with ID: ${assistant.id}`);
        assistantId = assistant.id;
      }
    } else {
      console.log("Creating new assistant");
      
      const assistant = await openai.beta.assistants.create({
        name: chatbot.name,
        instructions,
        model: modelName,
        file_ids: fileIds,
      });
      
      console.log(`Created new assistant with ID: ${assistant.id}`);
      assistantId = assistant.id;
    }

    // Update the chatbot with the training results
    await db.chatbot.update({
      where: {
        id: params.chatbotId,
      },
      data: {
        openaiId: assistantId,
        trainingStatus: "success",
        trainingMessage: "Training completed successfully",
        lastTrainedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Training completed successfully",
      assistantId,
    });
  } catch (error) {
    console.error("Error training chatbot:", error);

    // Update the chatbot with the error
    try {
      await db.chatbot.update({
        where: {
          id: params.chatbotId,
        },
        data: {
          trainingStatus: "error",
          trainingMessage: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    } catch (dbError) {
      console.error("Error updating chatbot with error status:", dbError);
    }

    return NextResponse.json(
      {
        error: "Failed to train chatbot",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 