const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting manual fix for conversation summaries...');

  try {
    // Check if the table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversationSummary'
      );
    `;
    
    console.log('Table exists check result:', tableExists);
    
    // If the table doesn't exist, create it
    if (!tableExists[0].exists) {
      console.log('Creating conversationSummary table...');
      
      await prisma.$executeRaw`
        CREATE TABLE "conversationSummary" (
          "id" TEXT NOT NULL,
          "threadId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "summary" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "userId" TEXT NOT NULL,
          
          CONSTRAINT "conversationSummary_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "conversationSummary_threadId_key" UNIQUE ("threadId"),
          CONSTRAINT "conversationSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `;
      
      console.log('Table created successfully!');
    } else {
      console.log('Table already exists, no need to create it.');
    }
    
    console.log('Manual fix completed successfully!');
  } catch (error) {
    console.error('Error during manual fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();