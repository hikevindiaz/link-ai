import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireAdminAPI } from '@/lib/admin-auth';

export async function GET() {
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

    // Fetch all agents with comprehensive data
    const agents = await db.chatbot.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
        createdAt: true,

        lastTrainedAt: true,
        trainingStatus: true,
        websiteEnabled: true,
        whatsappEnabled: true,
        smsEnabled: true,
        messengerEnabled: true,
        instagramEnabled: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            ChatbotFiles: true,
            knowledgeSources: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      agents: agents || [],
    });

  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
} 