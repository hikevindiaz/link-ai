import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Get knowledge sources with related data
    const knowledgeSources = await prisma.knowledgeSource.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      knowledgeSources
    });

  } catch (error) {
    console.error('Error fetching knowledge sources:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch knowledge sources',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, userId, catalogMode, assignToAgents, agentIds } = await request.json();

    if (!name || !userId) {
      return NextResponse.json({ 
        error: 'Name and userId are required' 
      }, { status: 400 });
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

    // Create the knowledge source
    const knowledgeSource = await prisma.knowledgeSource.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId,
        catalogMode: catalogMode || null,
        // Connect to agents if specified
        ...(assignToAgents && agentIds?.length > 0 ? {
          chatbots: {
            connect: agentIds.map((id: string) => ({ id }))
          }
        } : {})
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
      knowledgeSource
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating knowledge source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create knowledge source',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 