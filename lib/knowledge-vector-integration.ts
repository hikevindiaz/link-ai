import { createVectorStore, addFileToVectorStore, addFilesToVectorStore, updateChatbotVectorStores } from './vector-store';
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
 */
export async function processContentToVectorStore(
  knowledgeSourceId: string,
  content: any,
  type: 'qa' | 'text'
): Promise<void> {
  try {
    // Get knowledge source
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id: knowledgeSourceId },
    });

    if (!knowledgeSource) {
      console.error(`Knowledge source with ID ${knowledgeSourceId} not found`);
      return;
    }

    // Ensure vector store exists
    const vectorStoreId = await ensureVectorStore(knowledgeSourceId);
    if (!vectorStoreId) {
      console.error(`Failed to create vector store for knowledge source ${knowledgeSourceId}`);
      return;
    }

    const openai = getOpenAIClient();

    // Process the content based on its type
    let formattedContent: string;
    let fileName: string;

    if (type === 'qa') {
      fileName = `qa_content_${Date.now()}.md`;
      formattedContent = `# Question and Answer\n\n## Question\n${content.question}\n\n## Answer\n${content.answer}`;
    } else {
      fileName = `text_content_${Date.now()}.md`;
      formattedContent = `# Text Content\n\n${content.content || content}`;
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
  } catch (error) {
    console.error(`Error processing content to vector store for knowledge source ${knowledgeSourceId}:`, error);
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