// Script to migrate existing knowledge sources to vector stores

const { PrismaClient } = require('@prisma/client');
const { ensureVectorStore, updateChatbotsWithKnowledgeSource, processContentToVectorStore } = require('../lib/knowledge-vector-integration');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration of knowledge sources to vector stores...');
  
  // Get all knowledge sources
  const knowledgeSources = await prisma.knowledgeSource.findMany({
    include: {
      files: true,
      textContents: true,
      qaContents: true,
      chatbots: true,
    },
  });
  
  console.log(`Found ${knowledgeSources.length} knowledge sources to process.`);
  
  // Process each knowledge source
  for (const source of knowledgeSources) {
    console.log(`\nProcessing source: ${source.name} (${source.id})`);
    
    // Check if the source has a vector store already
    const sourceRecord = await prisma.$queryRaw`
      SELECT "vectorStoreId" FROM "knowledge_sources" WHERE id = ${source.id}
    `;
    
    const vectorStoreId = sourceRecord[0]?.vectorStoreId;
    
    // Skip sources that already have a vector store
    if (vectorStoreId) {
      console.log(`  Source already has vector store: ${vectorStoreId}, updating...`);
      await updateChatbotsWithKnowledgeSource(source.id);
      continue;
    }
    
    // Create a vector store for the source
    console.log('  Creating vector store...');
    const newVectorStoreId = await ensureVectorStore(source.id);
    
    if (!newVectorStoreId) {
      console.error(`  Failed to create vector store for source ${source.id}`);
      continue;
    }
    
    console.log(`  Vector store created: ${newVectorStoreId}`);
    
    // Process text content
    if (source.textContents.length > 0) {
      console.log(`  Processing ${source.textContents.length} text contents...`);
      
      for (const text of source.textContents) {
        try {
          await processContentToVectorStore(source.id, {
            content: text.content,
          }, 'text');
          console.log(`  Processed text content: ${text.id.substring(0, 8)}...`);
        } catch (error) {
          console.error(`  Error processing text content ${text.id}:`, error);
        }
      }
    }
    
    // Process QA content
    if (source.qaContents.length > 0) {
      console.log(`  Processing ${source.qaContents.length} QA contents...`);
      
      for (const qa of source.qaContents) {
        try {
          await processContentToVectorStore(source.id, {
            question: qa.question,
            answer: qa.answer,
          }, 'qa');
          console.log(`  Processed QA content: ${qa.id.substring(0, 8)}...`);
        } catch (error) {
          console.error(`  Error processing QA content ${qa.id}:`, error);
        }
      }
    }
    
    // Update chatbots
    if (source.chatbots.length > 0) {
      console.log(`  Updating ${source.chatbots.length} chatbots to use vector store...`);
      await updateChatbotsWithKnowledgeSource(source.id);
    }
    
    console.log(`  Completed processing source: ${source.name}`);
  }
  
  console.log('\nMigration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 