import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { sourceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const sourceId = params.sourceId;
    
    // Find the knowledge source
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: {
        id: sourceId,
        userId: session.user.id,
      },
      include: {
        chatbots: true,
      },
    });
    
    if (!knowledgeSource) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }
    
    // Return the assigned chatbots
    return NextResponse.json(knowledgeSource.chatbots);
    
  } catch (error) {
    console.error('Error fetching assigned agents:', error);
    return NextResponse.json({ error: 'Failed to fetch assigned agents' }, { status: 500 });
  }
} 