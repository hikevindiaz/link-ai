import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { getOpenAIClient } from "./openai";

/**
 * Creates a new Vector Store in OpenAI and stores the reference in the database
 * @param name Name of the vector store
 * @param description Optional description for the vector store
 * @param knowledgeSourceId ID of the knowledge source this vector store is associated with
 * @param expirationDays Optional number of days until the vector store expires after last activity
 */
export async function createVectorStore(
  name: string,
  description?: string,
  knowledgeSourceId?: string,
  expirationDays: number = 30
): Promise<{ id: string; name: string }> {
  const openai = getOpenAIClient();

  try {
    // Create the vector store in OpenAI
    const vectorStore = await openai.vectorStores.create({
      name,
      // Only include description if provided
      ...(description ? { description } : {}),
      expires_after: {
        anchor: "last_active_at",
        days: expirationDays
      }
    });

    // Store the vector store reference in the database
    if (knowledgeSourceId) {
      await prisma.knowledgeSource.update({
        where: { id: knowledgeSourceId },
        data: { 
          vectorStoreId: vectorStore.id,
          vectorStoreUpdatedAt: new Date()
        }
      });
    }

    return {
      id: vectorStore.id,
      name: vectorStore.name
    };
  } catch (error) {
    console.error("Error creating vector store:", error);
    throw error;
  }
}

/**
 * Determines the optimal chunking strategy based on content type
 * @param contentType The type of content being chunked
 * @returns The optimal chunking strategy for the content type
 */
export function getChunkingStrategy(contentType: 'text' | 'qa' | 'pdf' | 'website') {
  // Different content types might benefit from different chunking strategies
  switch (contentType) {
    case 'qa':
      // Q&A pairs should have longer chunks with less overlap
      return {
        chunking_strategy: {
          type: "static" as const,
          static: {
            max_chunk_size_tokens: 1200,
            chunk_overlap_tokens: 300
          }
        }
      };
    case 'pdf':
      // PDFs might benefit from more overlap to maintain context across page breaks
      return {
        chunking_strategy: {
          type: "static" as const,
          static: {
            max_chunk_size_tokens: 800,
            chunk_overlap_tokens: 400
          }
        }
      };
    case 'website':
      // Websites often have more structured content
      return {
        chunking_strategy: {
          type: "static" as const,
          static: {
            max_chunk_size_tokens: 600,
            chunk_overlap_tokens: 200
          }
        }
      };
    case 'text':
    default:
      // Default chunking strategy
      return {
        chunking_strategy: {
          type: "static" as const,
          static: {
            max_chunk_size_tokens: 800,
            chunk_overlap_tokens: 300
          }
        }
      };
  }
}

/**
 * Adds a file to an existing Vector Store
 * @param vectorStoreId ID of the vector store to add the file to
 * @param fileId ID of the file in OpenAI to add
 * @param contentType Optional content type for optimized chunking strategy
 */
export async function addFileToVectorStore(
  vectorStoreId: string,
  fileId: string,
  contentType: 'text' | 'qa' | 'pdf' | 'website' = 'text'
): Promise<void> {
  const openai = getOpenAIClient();

  try {
    // Get the chunking strategy based on content type
    const chunkingOptions = getChunkingStrategy(contentType);
    
    // Add the file to the vector store with the appropriate chunking strategy
    await openai.vectorStores.files.createAndPoll(
      vectorStoreId, 
      {
        file_id: fileId,
        ...chunkingOptions
      }
    );

    // Update the timestamp for the vector store in our database
    const knowledgeSource = await prisma.knowledgeSource.findFirst({
      where: {
        vectorStoreId: {
          equals: vectorStoreId
        }
      }
    });

    if (knowledgeSource) {
      await prisma.knowledgeSource.update({
        where: { id: knowledgeSource.id },
        data: { 
          vectorStoreUpdatedAt: new Date() 
        }
      });
    }
  } catch (error) {
    console.error(`Error adding file ${fileId} to vector store ${vectorStoreId}:`, error);
    throw error;
  }
}

/**
 * Adds multiple files to a vector store in a batch
 * @param vectorStoreId ID of the vector store
 * @param fileIds Array of file IDs to add
 * @param contentType Optional content type for optimized chunking strategy
 */
export async function addFilesToVectorStore(
  vectorStoreId: string,
  fileIds: string[],
  contentType: 'text' | 'qa' | 'pdf' | 'website' = 'text'
): Promise<void> {
  if (fileIds.length === 0) return;
  
  const openai = getOpenAIClient();

  try {
    // Get the chunking strategy based on content type
    const chunkingOptions = getChunkingStrategy(contentType);
    
    // Add files in batches to avoid rate limits (max 100 files per batch)
    const batchSize = 100;
    for (let i = 0; i < fileIds.length; i += batchSize) {
      const batch = fileIds.slice(i, i + batchSize);
      await openai.vectorStores.fileBatches.createAndPoll(
        vectorStoreId, 
        {
          file_ids: batch,
          ...chunkingOptions
        }
      );
    }

    // Update the timestamp for the vector store in our database
    const knowledgeSource = await prisma.knowledgeSource.findFirst({
      where: {
        vectorStoreId: {
          equals: vectorStoreId
        }
      }
    });

    if (knowledgeSource) {
      await prisma.knowledgeSource.update({
        where: { id: knowledgeSource.id },
        data: { 
          vectorStoreUpdatedAt: new Date() 
        }
      });
    }
  } catch (error) {
    console.error(`Error adding files to vector store ${vectorStoreId}:`, error);
    throw error;
  }
}

/**
 * Updates the expiration policy for a vector store
 * @param vectorStoreId ID of the vector store
 * @param expirationDays Number of days until the vector store expires after last activity
 */
export async function updateVectorStoreExpiration(
  vectorStoreId: string,
  expirationDays: number
): Promise<void> {
  const openai = getOpenAIClient();

  try {
    await openai.vectorStores.update(vectorStoreId, {
      expires_after: {
        anchor: "last_active_at",
        days: expirationDays
      }
    });
  } catch (error) {
    console.error(`Error updating expiration policy for vector store ${vectorStoreId}:`, error);
    throw error;
  }
}

/**
 * Retrieves a vector store and ensures it's ready to use
 * @param knowledgeSourceId ID of the knowledge source
 */
export async function getVectorStore(knowledgeSourceId: string): Promise<string | null> {
  try {
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id: knowledgeSourceId }
    });

    if (!knowledgeSource || !knowledgeSource.vectorStoreId) {
      return null;
    }

    const openai = getOpenAIClient();
    
    // Check if the vector store exists and is ready
    try {
      const vectorStore = await openai.vectorStores.retrieve(knowledgeSource.vectorStoreId);
      if (vectorStore.status === "completed") {
        return vectorStore.id;
      } else {
        console.log(`Vector store ${vectorStore.id} status: ${vectorStore.status}. Waiting for completion...`);
        // If not ready, poll until it's ready or fails
        const completedStore = await openai.vectorStores.retrieve(knowledgeSource.vectorStoreId);
        return completedStore.id;
      }
    } catch (error) {
      console.error(`Error retrieving vector store for knowledge source ${knowledgeSourceId}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`Error getting vector store for knowledge source ${knowledgeSourceId}:`, error);
    return null;
  }
}

/**
 * Updates an existing chatbot to use vector stores
 * @param chatbotId ID of the chatbot
 * @param knowledgeSourceIds IDs of knowledge sources to attach
 */
export async function updateChatbotVectorStores(
  chatbotId: string,
  knowledgeSourceIds: string[]
): Promise<void> {
  try {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        knowledgeSources: true
      }
    });

    if (!chatbot) {
      throw new Error(`Chatbot with ID ${chatbotId} not found`);
    }

    const openai = getOpenAIClient();
    
    // Get vector store IDs for all knowledge sources
    const vectorStoreIds: string[] = [];
    
    for (const sourceId of knowledgeSourceIds) {
      const vectorStoreId = await getVectorStore(sourceId);
      if (vectorStoreId) {
        vectorStoreIds.push(vectorStoreId);
      }
    }

    // Update the assistant with the vector store IDs
    if (vectorStoreIds.length > 0 && chatbot.openaiId) {
      await openai.beta.assistants.update(chatbot.openaiId, {
        tools: [{ type: "file_search" }],
        tool_resources: {
          file_search: {
            vector_store_ids: vectorStoreIds
          }
        }
      });
    }
  } catch (error) {
    console.error(`Error updating chatbot ${chatbotId} with vector stores:`, error);
    throw error;
  }
} 