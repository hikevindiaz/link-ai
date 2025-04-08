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
 * Processes a QA, text, or catalog content item into a file and adds it to the vector store
 * @param knowledgeSourceId The ID of the knowledge source
 * @param content The content to process
 * @param type The type of content ('qa', 'text', or 'catalog')
 * @returns The OpenAI file ID of the created file, or null if unsuccessful
 */
export async function processContentToVectorStore(
  knowledgeSourceId: string,
  content: any,
  type: 'qa' | 'text' | 'catalog',
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
    } else if (type === 'catalog') {
      fileName = `catalog_${Date.now()}.md`;
      formattedContent = `# Product Catalog\n\n${firstPersonInstructions}\n\n`;
      
      // Check if it has products
      const hasProducts = content.products && Array.isArray(content.products) && content.products.length > 0;
      
      // If it has extracted content or products, use that
      if (hasProducts) {
        // Format the products as markdown
        formattedContent += `## Our Products\n\n`;
        
        content.products.forEach((product: any, index: number) => {
          formattedContent += `### ${product.title}\n\n`;
          
          if (product.description) {
            formattedContent += `${product.description}\n\n`;
          }
          
          formattedContent += `**Price:** $${product.price.toFixed(2)}\n\n`;
          
          if (product.categories && product.categories.length > 0) {
            formattedContent += `**Categories:** ${product.categories.join(', ')}\n\n`;
          }
          
          if (product.imageUrl) {
            formattedContent += `**Image URL:** ${product.imageUrl}\n`;
            formattedContent += `NOTE: You can display this image by including this URL in your responses\n\n`;
          } else {
            formattedContent += `*No image available for this product*\n\n`;
          }
          
          // Add separator between products except for the last one
          if (index < content.products.length - 1) {
            formattedContent += `---\n\n`;
          }
        });
        
        if (content.instructions) {
          formattedContent += `## Custom Instructions\n\n${content.instructions}\n\n`;
        }
      }
      else {
        // If no products, but we have instructions, emphasize the instructions
        if (content.instructions) {
          formattedContent += `## Product Information Guidelines\n\n${content.instructions}\n\n`;
          formattedContent += `Note: No specific products are currently available in the catalog.\n\n`;
        } else {
          formattedContent += `No products are currently available in the catalog.\n\n`;
        }
      }
      
      // Add reminder about first-person response and image display
      formattedContent += `\nREMINDER: Always present product information in first-person plural (we/us/our) when responding to users. For example, "We offer this product at $X" rather than "The company sells this at $X".\n\n`;
      formattedContent += `IMPORTANT IMAGE DISPLAY INSTRUCTIONS:\n`;
      formattedContent += `- When a user first asks about a specific product, proactively include the image URL in your response\n`;
      formattedContent += `- Only share a product's image URL once per conversation unless specifically asked again\n`;
      formattedContent += `- If a user asks to see the product or image again, include the URL in your response\n`;
      formattedContent += `- Simply insert the full image URL in your response text and it will render as an image automatically\n`;
      formattedContent += `- Example: "We offer our Premium Widget for $99. Here's what it looks like: [image URL]"`;
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
    
    // Update the appropriate record with the OpenAI file ID for later reference
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
        } else if (type === 'catalog') {
          // For catalog content, update the associated file record
          // since CatalogContent doesn't have a direct openAIFileId field
          if (content.file?.id) {
            await prisma.$executeRaw`
              UPDATE "files"
              SET "openAIFileId" = ${uploadedFile.id}
              WHERE id = ${content.file.id}
            `;
            console.log(`Updated catalog file ${content.file.id} with OpenAI file ID ${uploadedFile.id}`);
          }
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
    await updateChatbotsWithKnowledgeSource(knowledgeSourceId);
    
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
 * Updates the vector store for catalog content, ensuring only one file exists
 * @param sourceId The ID of the knowledge source
 * @param catalogContentId The ID of the catalog content
 * @returns The OpenAI file ID of the created file, or null if unsuccessful
 */
export async function updateCatalogContentVector(
  sourceId: string,
  catalogContentId: string
): Promise<string | null> {
  console.log(`Updating vector store for catalog content ${catalogContentId} in knowledge source ${sourceId}`);
  try {
    // Get the knowledge source to verify vectorStoreId
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
    });

    if (!knowledgeSource) {
      console.error(`Knowledge source with ID ${sourceId} not found`);
      return null;
    }

    // Ensure vector store exists
    const vectorStoreId = await ensureVectorStore(sourceId);
    if (!vectorStoreId) {
      console.error(`Failed to create vector store for knowledge source ${sourceId}`);
      return null;
    }

    // Get the catalog content with current products
    const catalogContent = await prisma.catalogContent.findUnique({
      where: { id: catalogContentId },
      include: {
        products: true,
      },
    });

    if (!catalogContent) {
      console.error(`Catalog content with ID ${catalogContentId} not found`);
      return null;
    }

    // First, remove any existing file for this catalog content from the vector store
    try {
      // Check if we have an OpenAI file ID stored in the database
      const catalogContentData = await prisma.$queryRaw`
        SELECT * FROM "catalog_contents" WHERE id = ${catalogContentId}
      `;
      
      // Get the existing file ID if available
      const existingOpenAIFileId = catalogContentData?.[0]?.openAIFileId;
      
      if (existingOpenAIFileId) {
        console.log(`Found existing OpenAI file ID ${existingOpenAIFileId} for catalog content ${catalogContentId}`);
        
        // Get OpenAI client
        const openai = getOpenAIClient();
        
        // Remove from vector store
        try {
          await removeFileFromVectorStore(vectorStoreId, existingOpenAIFileId);
          console.log(`Removed file ${existingOpenAIFileId} from vector store ${vectorStoreId}`);
        } catch (removeError) {
          console.error(`Error removing file from vector store:`, removeError);
          // Continue even if removal fails
        }
        
        // Delete the file from OpenAI
        try {
          await openai.files.del(existingOpenAIFileId);
          console.log(`Deleted OpenAI file ${existingOpenAIFileId}`);
        } catch (deleteError) {
          console.error(`Error deleting OpenAI file ${existingOpenAIFileId}:`, deleteError);
          // Continue even if deletion fails
        }
      }
    } catch (error) {
      console.error(`Error handling existing file cleanup:`, error);
      // Continue with creating a new file even if cleanup fails
    }

    // Now create a new file with all current products
    const openAIFileId = await processContentToVectorStore(
      sourceId,
      {
        instructions: catalogContent.instructions || '',
        products: catalogContent.products,
      },
      'catalog',
      catalogContentId
    );

    if (!openAIFileId) {
      console.error(`Failed to create vector store file for catalog content ${catalogContentId}`);
      return null;
    }

    // Store the OpenAI file ID directly on the catalog content
    try {
      await prisma.$executeRaw`
        UPDATE "catalog_contents"
        SET "openAIFileId" = ${openAIFileId}
        WHERE id = ${catalogContentId}
      `;
      console.log(`Updated catalog content ${catalogContentId} with OpenAI file ID ${openAIFileId}`);
    } catch (updateError) {
      console.error(`Failed to update catalog content with OpenAI file ID:`, updateError);
      // Continue even if update fails
    }

    // Update the vector store timestamp
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { vectorStoreUpdatedAt: new Date() },
    });

    // Update all associated chatbots
    await updateChatbotsWithKnowledgeSource(sourceId);

    return openAIFileId;
  } catch (error) {
    console.error(`Error updating catalog content vector:`, error);
    return null;
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