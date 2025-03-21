import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// The schema for the assignment request
const assignPhoneNumberSchema = z.object({
  agentId: z.string().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const phoneNumberId = params.id;
    
    // Parse and validate the request body
    const body = await req.json();
    const validatedData = assignPhoneNumberSchema.parse(body);
    
    // First, verify that the phone number belongs to the user
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        userId: userId,
      },
    });
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }
    
    // If we're assigning to a chatbot, verify the chatbot belongs to the user
    if (validatedData.agentId) {
      const chatbot = await prisma.chatbot.findFirst({
        where: {
          id: validatedData.agentId,
          userId: userId,
        },
      });
      
      if (!chatbot) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      
      // Check if the agent already has a phone number
      const existingPhoneNumber = await prisma.twilioPhoneNumber.findFirst({
        where: {
          chatbotId: validatedData.agentId,
          id: { not: phoneNumberId }, // Exclude the current phone number
        },
      });
      
      if (existingPhoneNumber) {
        // Unassign the existing phone number
        await prisma.twilioPhoneNumber.update({
          where: { id: existingPhoneNumber.id },
          data: { chatbotId: null },
        });
      }
    }
    
    // Update the phone number with the new chatbot assignment
    const updatedPhoneNumber = await prisma.twilioPhoneNumber.update({
      where: { id: phoneNumberId },
      data: { chatbotId: validatedData.agentId },
      include: { chatbot: true },
    });
    
    // Also update the chatbot's phone number field
    if (validatedData.agentId) {
      await prisma.chatbot.update({
        where: { id: validatedData.agentId },
        data: { phoneNumber: phoneNumber.phoneNumber },
      });
    }
    
    return NextResponse.json({
      success: true,
      phoneNumber: {
        id: updatedPhoneNumber.id,
        number: updatedPhoneNumber.phoneNumber,
        agentId: updatedPhoneNumber.chatbotId,
        agentName: updatedPhoneNumber.chatbot?.name || null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    
    console.error('Error assigning phone number to agent:', error);
    return NextResponse.json({ error: 'Failed to assign phone number' }, { status: 500 });
  }
} 