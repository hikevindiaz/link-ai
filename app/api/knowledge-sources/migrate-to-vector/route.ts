import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
// Migration endpoint deprecated - vector processing now happens automatically
import { z } from 'zod';

// Schema for validating request body
const requestSchema = z.object({
  knowledgeSourceId: z.string().nonempty('Knowledge source ID is required'),
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const result = requestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
        { status: 400 }
      );
    }

    const { knowledgeSourceId } = result.data;

    // Check if the user has access to this knowledge source
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: knowledgeSourceId,
        userId: session.user.id,
      },
      include: {
        files: true,
        textContents: true,
        qaContents: true,
        websiteContents: true,
      },
    });

    if (!knowledgeSource) {
      return NextResponse.json(
        { error: 'Knowledge source not found or access denied' },
        { status: 404 }
      );
    }

    // Create or update the vector store
    const vectorStoreId = await ensureVectorStore(knowledgeSourceId);
    
    if (!vectorStoreId) {
      return NextResponse.json(
        { error: 'Failed to create vector store' },
        { status: 500 }
      );
    }

    // Process all content in the knowledge source
    const processingPromises = [];

    // Process QA content
    if (knowledgeSource.qaContents && knowledgeSource.qaContents.length > 0) {
      for (const qaContent of knowledgeSource.qaContents) {
        processingPromises.push(
          processContentToVectorStore(knowledgeSourceId, {
            question: qaContent.question,
            answer: qaContent.answer,
          }, 'qa')
        );
      }
    }

    // Process text content
    if (knowledgeSource.textContents && knowledgeSource.textContents.length > 0) {
      for (const textContent of knowledgeSource.textContents) {
        processingPromises.push(
          processContentToVectorStore(knowledgeSourceId, {
            content: textContent.content,
          }, 'text')
        );
      }
    }

    // Wait for all content processing to complete
    await Promise.all(processingPromises);

    // Update all chatbots that use this knowledge source
    await updateChatbotsWithKnowledgeSource(knowledgeSourceId);

    // Update the knowledge source with the latest vector store info using raw SQL
    // This way we don't need to rely on the schema having the vectorStoreId field defined
    try {
      await db.$executeRawUnsafe(`
        UPDATE "knowledge_sources"
        SET "vectorStoreId" = '${vectorStoreId}',
            "vectorStoreUpdatedAt" = '${new Date().toISOString()}'
        WHERE "id" = '${knowledgeSourceId}'
      `);
    } catch (sqlError) {
      console.warn('Could not update vector store fields in knowledge source:', sqlError);
      // This is okay - the ensureVectorStore function already handles this
    }

    return NextResponse.json({
      success: true,
      vectorStoreId,
      message: 'Knowledge source successfully migrated to vector store',
    });
  } catch (error) {
    console.error('Error migrating knowledge source to vector store:', error);
    return NextResponse.json(
      { 
        error: 'Failed to migrate knowledge source to vector store',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 