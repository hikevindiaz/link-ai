import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { deleteContent } from '@/lib/vector-service';

// Define schema for route parameters
const routeParamsSchema = z.object({
  sourceId: z.string(),
  contentId: z.string(),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: { sourceId: string; contentId: string } }
) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate route parameters
    const { sourceId, contentId } = routeParamsSchema.parse(params);

    // Verify user has access to this knowledge source
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        userId: session.user.id,
      },
    });

    if (!knowledgeSource) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    // First, handle vector store deletion
    console.log(`Handling vector store cleanup for text content ${contentId}`);
    await deleteContent(sourceId, 'text', contentId);

    // Then delete the text content from the database
    await db.textContent.delete({
      where: {
        id: contentId,
        knowledgeSourceId: sourceId,
      },
    });

    console.log(`Successfully deleted text content ${contentId} from database and updated vector store`);

    // Return success response
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting text content:', error);
    return NextResponse.json(
      { error: 'Failed to delete text content' },
      { status: 500 }
    );
  }
} 