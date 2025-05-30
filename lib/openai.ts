import OpenAI from "openai";
import prisma from "@/lib/prisma";

// Initialize OpenAI client with the global API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("CRITICAL ERROR: Missing OPENAI_API_KEY environment variable");
}

// Create a singleton instance of the OpenAI client
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: false, // Ensure this is false for server-side only
});

// Helper function to validate if the global API key is configured
export const isOpenAIConfigured = (): boolean => {
  if (!OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured");
    return false;
  }
  return true;
};

// Function to get the OpenAI client with validation
export const getOpenAIClient = (): OpenAI => {
  if (!OPENAI_API_KEY) {
    console.error("Attempted to use OpenAI client without API key");
    throw new Error("OpenAI API key is not configured");
  }
  return openai;
};

// Function to test the OpenAI connection
export const testOpenAIConnection = async (): Promise<boolean> => {
  try {
    if (!OPENAI_API_KEY) {
      console.error("Cannot test OpenAI connection: API key is missing");
      return false;
    }
    
    console.log("Testing OpenAI connection...");
    const models = await openai.models.list();
    console.log(`OpenAI connection successful, found ${models.data.length} models`);
    return models.data.length > 0;
  } catch (error) {
    console.error("OpenAI connection test failed:", error);
    return false;
  }
};

// Helper function to create a new thread
export const createThread = async (): Promise<string> => {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key is not configured");
  }
  
  try {
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
};

// Helper function to add a message to a thread
export const addMessageToThread = async (
  threadId: string,
  content: string,
  fileIds?: string[]
): Promise<void> => {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key is not configured");
  }
  
  try {
    const messageParams: any = {
      role: 'user',
      content: content,
    };
    
    if (fileIds && fileIds.length > 0) {
      messageParams.file_ids = fileIds;
    }
    
    await openai.beta.threads.messages.create(threadId, messageParams);
  } catch (error) {
    console.error("Error adding message to thread:", error);
    throw error;
  }
};

// Helper function to run an assistant on a thread
export const runAssistant = async (
  threadId: string,
  assistantId: string,
  maxWaitTime: number = 30000 // 30 seconds default timeout
): Promise<string> => {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key is not configured");
  }
  
  try {
    // Create a run
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });
    
    // Poll for completion
    const startTime = Date.now();
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    
    while (runStatus.status !== 'completed') {
      // Check for failure states
      if (
        runStatus.status === 'failed' ||
        runStatus.status === 'cancelled' ||
        runStatus.status === 'expired'
      ) {
        throw new Error(`Run failed with status: ${runStatus.status}`);
      }
      
      // Check for timeout
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Request timed out');
      }
      
      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }
    
    // Get the messages
    const messages = await openai.beta.threads.messages.list(threadId);
    
    // Find the last assistant message
    const lastMessage = messages.data
      .filter((message) => message.role === 'assistant')
      .shift();
    
    if (!lastMessage) {
      throw new Error('No response from assistant');
    }
    
    // Extract the content
    let messageContent = '';
    
    if (lastMessage.content && lastMessage.content.length > 0) {
      for (const contentBlock of lastMessage.content) {
        if (contentBlock.type === 'text') {
          messageContent += contentBlock.text.value;
        } else if (contentBlock.type === 'image_file') {
          messageContent += `[Image: ${contentBlock.image_file.file_id}]`;
        }
      }
    }
    
    return messageContent;
  } catch (error) {
    console.error("Error running assistant:", error);
    throw error;
  }
};

// Helper function to verify if an assistant exists and recreate it if it doesn't
export const verifyAssistant = async (chatbotId: string): Promise<string> => {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key is not configured");
  }
  
  try {
    // Get the chatbot from the database
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        model: true,
        ChatbotFiles: {
          include: {
            file: true
          }
        }
      }
    });
    
    if (!chatbot) {
      throw new Error(`Chatbot with ID ${chatbotId} not found`);
    }
    
    // Try to retrieve the assistant
    try {
      await openai.beta.assistants.retrieve(chatbot.openaiId);
      console.log(`Assistant ${chatbot.openaiId} exists.`);
      return chatbot.openaiId;
    } catch (error: any) {
      // If the assistant doesn't exist (404), create a new one
      if (error.status === 404) {
        console.log(`Assistant ${chatbot.openaiId} not found. Creating a new one...`);
        
        // Get the file IDs
        const fileIds = chatbot.ChatbotFiles.map(cf => cf.file.openAIFileId);
        
        // Create a new assistant
        const newAssistant = await openai.beta.assistants.create({
          name: chatbot.name,
          instructions: chatbot.prompt || "You are a helpful assistant.",
          model: chatbot.model?.name || "gpt-4o",
          tools: [
            { type: "file_search" }, 
            { type: "code_interpreter" }
          ],
          // Only add file_ids if there are files to add
          ...(fileIds.length > 0 ? { file_ids: fileIds } : {})
        });
        
        console.log(`Created new assistant with ID: ${newAssistant.id}`);
        
        // Update the chatbot in the database with the new assistant ID
        await prisma.chatbot.update({
          where: { id: chatbot.id },
          data: { openaiId: newAssistant.id }
        });
        
        return newAssistant.id;
      } else {
        // If it's another error, rethrow it
        throw error;
      }
    }
  } catch (error) {
    console.error("Error verifying assistant:", error);
    throw error;
  }
};

// Get the OpenAI API key for the current user or use the global key
export async function getOpenAIKey(userId?: string): Promise<string> {
  // If no userId is provided, use the global API key
  if (!userId) {
    const globalApiKey = process.env.OPENAI_API_KEY;
    if (!globalApiKey) {
      throw new Error("No OpenAI API key found");
    }
    return globalApiKey;
  }

  // Try to get the user's custom API key
  try {
    const openAIConfig = await prisma.openAIConfig.findUnique({
      where: {
        userId,
      },
    });

    // If the user has a custom API key, use it
    if (openAIConfig?.globalAPIKey) {
      return openAIConfig.globalAPIKey;
    }
  } catch (error) {
    console.error("Error fetching user's OpenAI API key:", error);
  }

  // Fall back to the global API key
  const globalApiKey = process.env.OPENAI_API_KEY;
  if (!globalApiKey) {
    throw new Error("No OpenAI API key found");
  }
  return globalApiKey;
}

// Get the OpenAI model name from the model ID
export async function getModelNameFromId(modelId: string): Promise<string> {
  try {
    const model = await prisma.chatbotModel.findUnique({
      where: {
        id: modelId,
      },
    });

    if (model) {
      return model.name;
    }
  } catch (error) {
    console.error("Error fetching model name:", error);
  }

  // Default to gpt-4o-mini if model not found
  return "gpt-4.1-mini-2025-04-14";
}

// Upload a file to OpenAI and return the file ID
export async function uploadFileToOpenAI(
  openai: OpenAI,
  fileUrl: string,
  fileName: string
): Promise<string> {
  try {
    // Download the file from the URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const fileBlob = await response.blob();
    
    // Convert blob to buffer
    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a File object from the buffer
    const file = new File([buffer], fileName, { 
      type: fileBlob.type || 'application/octet-stream' 
    });
    
    // Upload the file to OpenAI
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants",
    });
    
    return uploadedFile.id;
  } catch (error) {
    console.error("Error uploading file to OpenAI:", error);
    throw error;
  }
}

// Process text content into a file for OpenAI
export async function processTextToFile(
  openai: OpenAI,
  content: string,
  fileName: string
): Promise<string> {
  try {
    // Convert text to a File object
    const file = new File([content], fileName, { 
      type: 'text/plain' 
    });
    
    // Upload the file to OpenAI
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants",
    });
    
    return uploadedFile.id;
  } catch (error) {
    console.error("Error processing text to file:", error);
    throw error;
  }
}

// Create a combined file from QA pairs
export async function processQAPairsToFile(
  openai: OpenAI,
  qaPairs: any[],
  fileName: string
): Promise<string> {
  try {
    // Format QA pairs into a markdown document
    let content = "# Knowledge Base Q&A\n\n";
    
    qaPairs.forEach((qa, index) => {
      content += `## Question ${index + 1}\n${qa.question}\n\n`;
      content += `### Answer\n${qa.answer}\n\n---\n\n`;
    });
    
    // Create a File object from the content
    const file = new File([content], fileName, { 
      type: 'text/markdown' 
    });
    
    // Upload the file to OpenAI
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants",
    });
    
    return uploadedFile.id;
  } catch (error) {
    console.error("Error processing QA pairs to file:", error);
    throw error;
  }
}

// Initialize OpenAI client with API key
export function initOpenAI(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
  });
}
