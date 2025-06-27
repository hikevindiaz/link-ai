import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourceId } = params;
    const { agentIds } = await request.json();

    if (!Array.isArray(agentIds)) {
      return NextResponse.json({ 
        error: 'agentIds must be an array' 
      }, { status: 400 });
    }

    // Verify the knowledge source exists
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id: sourceId }
    });

    if (!knowledgeSource) {
      return NextResponse.json({ 
        error: 'Knowledge source not found' 
      }, { status: 404 });
    }

    // Verify all agents exist
    if (agentIds.length > 0) {
      const existingAgents = await prisma.chatbot.findMany({
        where: { id: { in: agentIds } },
        select: { id: true }
      });

      if (existingAgents.length !== agentIds.length) {
        const foundIds = existingAgents.map(agent => agent.id);
        const missingIds = agentIds.filter(id => !foundIds.includes(id));
        return NextResponse.json({ 
          error: `Agents not found: ${missingIds.join(', ')}` 
        }, { status: 404 });
      }
    }

    // First, disconnect all current assignments
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        chatbots: {
          set: [] // This disconnects all current connections
        }
      }
    });

    // Then, connect to the new agents
    const updatedSource = await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        chatbots: {
          connect: agentIds.map((id: string) => ({ id }))
        }
      },
      include: {
        chatbots: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Knowledge source assigned to ${agentIds.length} agent(s)`,
      knowledgeSource: updatedSource
    });

  } catch (error) {
    console.error('Error assigning knowledge source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to assign knowledge source',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 