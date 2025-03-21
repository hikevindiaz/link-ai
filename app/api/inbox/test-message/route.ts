import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  // Get the session to fetch the authenticated user
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { threadId, chatbotId, message } = await request.json();
    
    if (!threadId || !chatbotId || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        required: ['threadId', 'chatbotId', 'message'] 
      }, { status: 400 });
    }
    
    // Create a new message with read explicitly set to false
    const newMessage = await prisma.message.create({
      data: {
        message,
        response: "This is a test response",
        threadId,
        chatbotId,
        userId: session.user.id,
        from: "user",
        read: false, // Explicitly set to false
      },
    });
    
    console.log(`Created test message with ID ${newMessage.id} in thread ${threadId}`);
    console.log(`Read status: ${newMessage.read}`);
    
    return NextResponse.json({ 
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Error creating test message:', error);
    return NextResponse.json({ 
      error: 'Failed to create test message',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 