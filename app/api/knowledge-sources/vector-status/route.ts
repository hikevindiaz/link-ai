import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema for validating query parameters
const querySchema = z.object({
  knowledgeSourceId: z.string().nonempty('Knowledge source ID is required'),
});

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const knowledgeSourceId = searchParams.get('knowledgeSourceId');
    
    const result = querySchema.safeParse({ knowledgeSourceId });
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
        { status: 400 }
      );
    }

    // Check if the user has access to this knowledge source
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: knowledgeSourceId,
        userId: session.user.id,
      },
    });

    if (!knowledgeSource) {
      return NextResponse.json(
        { error: 'Knowledge source not found or access denied' },
        { status: 404 }
      );
    }

    // Query raw for vector store information
    const rawResult = await db.$queryRawUnsafe<{ vectorStoreId: string | null, vectorStoreUpdatedAt: Date | null }[]>(`
      SELECT "vectorStoreId", "vectorStoreUpdatedAt" 
      FROM "knowledge_sources" 
      WHERE "id" = '${knowledgeSourceId}'
    `);

    const vectorStoreId = rawResult?.[0]?.vectorStoreId || null;
    const vectorStoreUpdatedAt = rawResult?.[0]?.vectorStoreUpdatedAt || null;

    return NextResponse.json({
      success: true,
      hasMigrated: !!vectorStoreId,
      vectorStoreId,
      vectorStoreUpdatedAt,
      message: vectorStoreId 
        ? `Knowledge source is using vector store (last updated: ${vectorStoreUpdatedAt?.toISOString()})` 
        : 'Knowledge source has not been migrated to a vector store',
    });
  } catch (error) {
    console.error('Error checking knowledge source vector status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check knowledge source vector status',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 