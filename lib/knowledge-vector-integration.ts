import { createVectorStore, addFileToVectorStore, addFilesToVectorStore, updateChatbotVectorStores, removeFileFromVectorStore } from './vector-store';
import prisma from '@/lib/prisma';
import { getOpenAIClient } from './openai';

/**
 * Creates or updates a vector store for a knowledge source
 * @param knowledgeSourceId The ID of the knowledge source
 */
export async function ensureVectorStore(knowledgeSourceId: string): Promise<string | null> {
  try {
    // Get knowledge source
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id: knowledgeSourceId },
      include: {
        files: true,
      },
    });

    if (!knowledgeSource) {
      console.error(`Knowledge source with ID ${knowledgeSourceId} not found`);
      return null;
    }

    let vectorStoreId = knowledgeSource.vectorStoreId;

    // Create vector store if it doesn't exist
    if (!vectorStoreId) {
      console.log(`Creating vector store for knowledge source ${knowledgeSource.name}`);
      const vectorStore = await createVectorStore(
        `${knowledgeSource.name} Vector Store`,
        knowledgeSource.description || undefined,
        knowledgeSourceId
      );
      vectorStoreId = vectorStore.id;
    }

    // Add files to vector store if needed
    if (knowledgeSource.files && knowledgeSource.files.length > 0) {
      console.log(`Adding ${knowledgeSource.files.length} files to vector store`);
      const fileIds = knowledgeSource.files
        .filter(file => file.openAIFileId) // Only include files with OpenAI file IDs
        .map(file => file.openAIFileId);
      
      if (fileIds.length > 0) {
        await addFilesToVectorStore(vectorStoreId, fileIds);
      }
    }

    return vectorStoreId;
  } catch (error) {
    console.error(`Error ensuring vector store for knowledge source ${knowledgeSourceId}:`, error);
    return null;
  }
}

/**
 * Processes a QA or text content item into a file and adds it to the vector store
 * @param knowledgeSourceId The ID of the knowledge source
 * @param content The content to process
 * @param type The type of content ('qa' or 'text')
 * @returns The OpenAI file ID of the created file, or null if unsuccessful
 */
export async function processContentToVectorStore(
  knowledgeSourceId: string,
  content: any,
  type: 'qa' | 'text',
  contentId?: string
): Promise<string | null> {
  try {
    // Get knowledge source
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id: knowledgeSourceId },
    });

    if (!knowledgeSource) {
      console.error(`Knowledge source with ID ${knowledgeSourceId} not found`);
      return null;
    }

    // Ensure vector store exists
    const vectorStoreId = await ensureVectorStore(knowledgeSourceId);
    if (!vectorStoreId) {
      console.error(`Failed to create vector store for knowledge source ${knowledgeSourceId}`);
      return null;
    }

    const openai = getOpenAIClient();

    // Process the content based on its type
    let formattedContent: string;
    let fileName: string;

    // Include first-person instructions in all content types
    const firstPersonInstructions = `IMPORTANT: This is official company information that must be conveyed in first-person plural (we/us/our) voice. Always speak as the company itself, never in third person.`;

    if (type === 'qa') {
      fileName = `qa_content_${Date.now()}.md`;
      formattedContent = `# Question and Answer\n\n${firstPersonInstructions}\n\n## Question\n${content.question}\n\n## Answer\n${content.answer}\n\nREMINDER: Always rewrite this answer in first-person plural (we/us/our) when responding to users.`;
    } else {
      fileName = `text_content_${Date.now()}.md`;
      formattedContent = `# Text Content\n\n${firstPersonInstructions}\n\n${content.content || content}\n\nREMINDER: Always convert this information to first-person plural (we/us/our) when responding to users.`;
    }

    // Create a file with the content
    const file = new File([formattedContent], fileName, { type: 'text/markdown' });
    
    // Upload the file to OpenAI
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants",
    });

    // Add the file to vector store
    await addFileToVectorStore(vectorStoreId, uploadedFile.id);
    
    // If we have a contentId for text content, store the OpenAI file ID for later reference
    if (contentId) {
      try {
        if (type === 'text') {
          // Store the OpenAI file ID in the textContent record
          await prisma.$executeRaw`
            UPDATE "text_contents"
            SET "openAIFileId" = ${uploadedFile.id}
            WHERE id = ${contentId}
          `;
          console.log(`Updated text content ${contentId} with OpenAI file ID ${uploadedFile.id}`);
        } else if (type === 'qa') {
          // Store the OpenAI file ID in the qaContent record
          await prisma.$executeRaw`
            UPDATE "qa_contents"
            SET "openAIFileId" = ${uploadedFile.id}
            WHERE id = ${contentId}
          `;
          console.log(`Updated QA content ${contentId} with OpenAI file ID ${uploadedFile.id}`);
        }
      } catch (updateError) {
        console.error(`Failed to update content ${contentId} with OpenAI file ID:`, updateError);
        // Continue even if update fails
      }
    }

    // Update the vector store timestamp
    await prisma.knowledgeSource.update({
      where: { id: knowledgeSourceId },
      data: { vectorStoreUpdatedAt: new Date() },
    });

    // Update all associated chatbots
    const chatbots = await prisma.chatbot.findMany({
      where: {
        knowledgeSources: {
          some: {
            id: knowledgeSourceId,
          },
        },
      },
    });

    for (const chatbot of chatbots) {
      await updateChatbotVectorStores(chatbot.id, [knowledgeSourceId]);
    }
    
    return uploadedFile.id;
  } catch (error) {
    console.error(`Error processing content to vector store for knowledge source ${knowledgeSourceId}:`, error);
    return null;
  }
}

/**
 * Updates chatbots with the vector store for a knowledge source
 * @param knowledgeSourceId The ID of the knowledge source
 */
export async function updateChatbotsWithKnowledgeSource(knowledgeSourceId: string): Promise<void> {
  try {
    // Ensure vector store exists
    const vectorStoreId = await ensureVectorStore(knowledgeSourceId);
    if (!vectorStoreId) {
      console.error(`Failed to create vector store for knowledge source ${knowledgeSourceId}`);
      return;
    }

    // Get chatbots associated with this knowledge source
    const chatbots = await prisma.chatbot.findMany({
      where: {
        knowledgeSources: {
          some: {
            id: knowledgeSourceId,
          },
        },
      },
    });

    // Update each chatbot with the vector store
    for (const chatbot of chatbots) {
      console.log(`Updating chatbot ${chatbot.name} with vector store for knowledge source`);
      await updateChatbotVectorStores(chatbot.id, [knowledgeSourceId]);
    }
  } catch (error) {
    console.error(`Error updating chatbots with vector store for knowledge source ${knowledgeSourceId}:`, error);
  }
}

/**
 * Handles deletion of text content, including vector store cleanup
 * @param knowledgeSourceId The ID of the knowledge source
 * @param contentId The ID of the text content being deleted
 */
export async function handleTextContentDeletion(knowledgeSourceId: string, contentId: string): Promise<void> {
  try {
    console.log(`Handling deletion of text content ${contentId} from knowledge source ${knowledgeSourceId}`);
    
    // Get knowledge source
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id: knowledgeSourceId },
    });

    if (!knowledgeSource) {
      console.error(`Knowledge source with ID ${knowledgeSourceId} not found`);
      return;
    }

    // If there's no vector store, nothing to clean up
    if (!knowledgeSource.vectorStoreId) {
      console.log(`Knowledge source has no vector store, no cleanup needed`);
      return;
    }

    const vectorStoreId = knowledgeSource.vectorStoreId;
    
    // Try to get the OpenAI file ID associated with this text content
    let openAIFileId: string | null = null;
    try {
      // First check if the text content has an OpenAI file ID stored directly
      const textContentResult = await prisma.$queryRaw`
        SELECT "openAIFileId" FROM "text_contents"
        WHERE id = ${contentId} AND "knowledgeSourceId" = ${knowledgeSourceId}
      `;
      
      if (Array.isArray(textContentResult) && textContentResult.length > 0 && textContentResult[0].openAIFileId) {
        openAIFileId = textContentResult[0].openAIFileId;
        console.log(`Found OpenAI file ID ${openAIFileId} for text content ${contentId}`);
      }
    } catch (queryError) {
      console.error(`Error querying for text content OpenAI file ID:`, queryError);
      // Continue even if query fails
    }
    
    // If we found an OpenAI file ID, try to delete it from the vector store and OpenAI
    if (openAIFileId && vectorStoreId) {
      const openai = await import('./openai').then(m => m.getOpenAIClient());
      
      try {
        // First remove from vector store
        console.log(`Attempting to remove file ${openAIFileId} from vector store ${vectorStoreId}`);
        const removed = await removeFileFromVectorStore(vectorStoreId, openAIFileId);
        if (removed) {
          console.log(`Successfully removed file ${openAIFileId} from vector store ${vectorStoreId}`);
        } else {
          console.warn(`Failed to remove file ${openAIFileId} from vector store ${vectorStoreId}`);
        }

        // Then delete the OpenAI file
        try {
          await openai.files.del(openAIFileId);
          console.log(`Successfully deleted OpenAI file ${openAIFileId}`);
        } catch (deleteError) {
          console.error(`Error deleting OpenAI file ${openAIFileId}:`, deleteError);
        }
      } catch (removeError) {
        console.error(`Error removing file from vector store:`, removeError);
      }
    } else {
      console.log(`No OpenAI file ID found for text content ${contentId}, using fallback update method`);
    }
    
    // Always update the timestamp and chatbots as a fallback
    // 1. Update the vector store timestamp to indicate a change
    await prisma.knowledgeSource.update({
      where: { id: knowledgeSourceId },
      data: { 
        vectorStoreUpdatedAt: new Date(),
      }
    });
    
    console.log(`Updated vector store timestamp for knowledge source ${knowledgeSourceId}`);
    
    // 2. Update all associated chatbots to ensure they have the latest vector store info
    await updateChatbotsWithKnowledgeSource(knowledgeSourceId);
    
    console.log(`Updated associated chatbots for knowledge source ${knowledgeSourceId}`);
  } catch (error) {
    console.error(`Error handling text content deletion for knowledge source ${knowledgeSourceId}:`, error);
  }
}

/**
 * Handles deletion of QA content, including vector store cleanup
 * @param knowledgeSourceId The ID of the knowledge source
 * @param contentId The ID of the QA content being deleted
 */
export async function handleQAContentDeletion(
  sourceId: string,
  contentId: string
): Promise<boolean> {
  console.log(`Attempting to delete QA content ${contentId} from vector store for source ${sourceId}`);
  try {
    // Get the OpenAI client
    const openai = getOpenAIClient();
    
    // Get the vector store ID for the knowledge source
    const source = await prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
      select: { vectorStoreId: true },
    });

    if (!source?.vectorStoreId) {
      console.log(`No vector store found for source ${sourceId}`);
      return false;
    }

    // Get the QA content record with openAIFileId using raw query to ensure we get all fields
    const qaContentRows = await prisma.$queryRaw`
      SELECT * FROM "qa_contents" WHERE id = ${contentId}
    `;
    
    const qaContent = qaContentRows && Array.isArray(qaContentRows) && qaContentRows.length > 0 
      ? qaContentRows[0] 
      : null;

    // Check if we have an OpenAI file ID to delete
    if (qaContent && qaContent.openAIFileId) {
      const fileId = qaContent.openAIFileId as string;
      console.log(`Found OpenAI file ID ${fileId} for QA content ${contentId}`);
      
      try {
        // First try to remove from vector store
        await removeFileFromVectorStore(source.vectorStoreId, fileId);
        console.log(`Removed file ${fileId} from vector store ${source.vectorStoreId}`);
        
        // Then try to delete the actual file from OpenAI
        await openai.files.del(fileId);
        console.log(`Deleted OpenAI file ${fileId}`);
      } catch (error) {
        console.error(`Error removing file from vector store or OpenAI:`, error);
        // Continue even if removal fails
      }
    } else {
      console.log(`No OpenAI file ID found for QA content ${contentId}`);
    }

    // Update the vector store timestamp regardless of whether we found a file to delete
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { vectorStoreUpdatedAt: new Date() },
    });

    return true;
  } catch (error) {
    console.error(`Error handling QA content deletion:`, error);
    return false;
  }
}

/**
 * Adds documents to a vector store
 * @param vectorStoreId The ID of the vector store
 * @param documents An array of documents to add, each with pageContent and metadata
 * @returns boolean indicating success or failure
 */
export async function addDocumentsToVectorStore(
  vectorStoreId: string,
  documents: Array<{ pageContent: string; metadata: any }>
): Promise<boolean> {
  try {
    if (!vectorStoreId || !documents || documents.length === 0) {
      console.error('Invalid vectorStoreId or documents');
      return false;
    }

    console.log(`Adding ${documents.length} documents to vector store ${vectorStoreId}`);

    const openai = getOpenAIClient();
    
    // First, create a file with the documents
    const fileName = `document_content_${Date.now()}.jsonl`;
    
    // Convert documents to JSONL format
    const jsonlContent = documents.map(doc => 
      JSON.stringify({
        text: doc.pageContent,
        metadata: doc.metadata
      })
    ).join('\n');
    
    // Create a file with the content
    const file = new File([jsonlContent], fileName, { type: 'application/jsonl' });
    
    // Upload the file to OpenAI
    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants",
    });
    
    // Add the file to vector store
    await addFileToVectorStore(vectorStoreId, uploadedFile.id);
    
    console.log(`Successfully added documents to vector store ${vectorStoreId} via file ${uploadedFile.id}`);
    return true;
  } catch (error) {
    console.error(`Error adding documents to vector store ${vectorStoreId}:`, error);
    return false;
  }
} 