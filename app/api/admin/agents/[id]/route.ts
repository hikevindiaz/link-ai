import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireAdminAPI } from '@/lib/admin-auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminCheck = await requireAdminAPI();
    if (adminCheck) {
      return adminCheck; // Return the error response
    }

    const agentId = params.id;

    // Fetch agent with complete data
    const agent = await db.chatbot.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        userId: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent });

  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminCheck = await requireAdminAPI();
    if (adminCheck) {
      return adminCheck; // Return the error response
    }

    const agentId = params.id;
    const body = await request.json();
    const { name, userId } = body;

    // Validate input
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Owner is required' }, { status: 400 });
    }

    // Check if agent exists
    const existingAgent = await db.chatbot.findUnique({
      where: { id: agentId },
      select: { id: true, name: true },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if new owner exists
    const newOwner = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!newOwner) {
      return NextResponse.json({ error: 'New owner not found' }, { status: 404 });
    }

    // Update the agent
    const updatedAgent = await db.chatbot.update({
      where: { id: agentId },
      data: {
        name: name.trim(),
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      success: true,
      message: `Agent "${updatedAgent.name}" updated successfully`,
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminCheck = await requireAdminAPI();
    if (adminCheck) {
      return adminCheck; // Return the error response
    }

    const agentId = params.id;

    // Check if agent exists
    const agent = await db.chatbot.findUnique({
      where: { id: agentId },
      select: { id: true, name: true },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete the agent
    await db.chatbot.delete({
      where: { id: agentId },
    });

    return NextResponse.json({ 
      success: true,
      message: `Agent "${agent.name}" deleted successfully` 
    });

  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
} 