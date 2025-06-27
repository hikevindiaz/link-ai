import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
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

    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            files: true,
            textContents: true,
            websiteContents: true,
            qaContents: true,
            catalogContents: true,
            chatbots: true
          }
        },
        chatbots: {
          select: {
            id: true,
            name: true
          }
        },
        files: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        },
        textContents: {
          select: {
            id: true,
            content: true,
            createdAt: true
          }
        },
        websiteContents: {
          select: {
            id: true,
            url: true,
            createdAt: true
          }
        },
        qaContents: {
          select: {
            id: true,
            question: true,
            answer: true,
            createdAt: true
          }
        }
      }
    });

    if (!knowledgeSource) {
      return NextResponse.json({ 
        error: 'Knowledge source not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      knowledgeSource
    });

  } catch (error) {
    console.error('Error fetching knowledge source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch knowledge source',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { name, description, userId, catalogMode } = await request.json();

    if (!name || !userId) {
      return NextResponse.json({ 
        error: 'Name and userId are required' 
      }, { status: 400 });
    }

    // Verify the knowledge source exists
    const existingSource = await prisma.knowledgeSource.findUnique({
      where: { id: sourceId }
    });

    if (!existingSource) {
      return NextResponse.json({ 
        error: 'Knowledge source not found' 
      }, { status: 404 });
    }

    // Verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Update the knowledge source
    const updatedSource = await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId,
        catalogMode: catalogMode || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            files: true,
            textContents: true,
            websiteContents: true,
            qaContents: true,
            catalogContents: true,
            chatbots: true
          }
        },
        chatbots: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      knowledgeSource: updatedSource
    });

  } catch (error) {
    console.error('Error updating knowledge source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update knowledge source',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Verify the knowledge source exists
    const existingSource = await prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
      include: {
        _count: {
          select: {
            chatbots: true
          }
        }
      }
    });

    if (!existingSource) {
      return NextResponse.json({ 
        error: 'Knowledge source not found' 
      }, { status: 404 });
    }

    // Check if knowledge source is assigned to any agents
    if (existingSource._count.chatbots > 0) {
      return NextResponse.json({ 
        error: `Cannot delete knowledge source. It is currently assigned to ${existingSource._count.chatbots} agent(s). Please unassign it first.` 
      }, { status: 400 });
    }

    // Delete the knowledge source (this will cascade delete related content)
    await prisma.knowledgeSource.delete({
      where: { id: sourceId }
    });

    return NextResponse.json({
      success: true,
      message: 'Knowledge source deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting knowledge source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete knowledge source',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 