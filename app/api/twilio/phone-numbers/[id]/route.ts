import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import twilio from 'twilio';

// Initialize Twilio
const twilioMainClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function DELETE(
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
    
    // First, verify that the phone number belongs to the user
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        userId: userId,
      },
      include: {
        chatbot: true,
      },
    });
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }
    
    // If this phone number is assigned to a chatbot, update the chatbot
    if (phoneNumber.chatbotId) {
      await prisma.chatbot.update({
        where: { id: phoneNumber.chatbotId },
        data: { phoneNumber: null },
      });
    }
    
    // Delete the phone number from Twilio
    try {
      await twilioMainClient.incomingPhoneNumbers(phoneNumber.twilioSid).remove();
    } catch (error: any) {
      console.error('Error deleting phone number from Twilio:', error);
      // Continue with deletion in our database even if Twilio deletion fails
    }
    
    // Delete the phone number from the database
    await prisma.twilioPhoneNumber.delete({
      where: { id: phoneNumberId },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Phone number deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json({ error: 'Failed to delete phone number' }, { status: 500 });
  }
} 