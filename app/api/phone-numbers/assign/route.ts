import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PhoneNumberService } from '@/lib/twilio/phone-number-service';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

/**
 * POST /api/phone-numbers/assign
 * Assign a phone number to an agent/chatbot with automatic webhook configuration
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { phoneNumberId, chatbotId, enableSms, enableWhatsApp } = body;
    
    if (!phoneNumberId || !chatbotId) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumberId and chatbotId' },
        { status: 400 }
      );
    }
    
    // Verify ownership of both resources
    const [phoneNumber, chatbot] = await Promise.all([
      prisma.twilioPhoneNumber.findFirst({
        where: {
          id: phoneNumberId,
          userId: session.user.id
        }
      }),
      prisma.chatbot.findFirst({
        where: {
          id: chatbotId,
          userId: session.user.id
        }
      })
    ]);
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number not found or unauthorized' },
        { status: 404 }
      );
    }
    
    if (!chatbot) {
      return NextResponse.json(
        { error: 'Chatbot not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Use the phone number service to handle assignment and webhook configuration
    const phoneService = new PhoneNumberService();
    
    await phoneService.assignPhoneNumber({
      phoneNumberId,
      chatbotId,
      enableSms: enableSms || false,
      enableWhatsApp: enableWhatsApp || false
    });
    
    logger.info('Phone number assigned via API', {
      userId: session.user.id,
      phoneNumberId,
      chatbotId
    }, 'phone-assign-api');
    
    // Return updated phone number with chatbot details
    const updatedPhoneNumber = await prisma.twilioPhoneNumber.findUnique({
      where: { id: phoneNumberId },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
            smsEnabled: true,
            whatsappEnabled: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      phoneNumber: updatedPhoneNumber,
      message: 'Phone number assigned and webhooks configured successfully'
    });
    
  } catch (error) {
    logger.error('Error assigning phone number', {
      error: error.message
    }, 'phone-assign-api');
    
    return NextResponse.json(
      { error: error.message || 'Failed to assign phone number' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/phone-numbers/assign
 * Unassign a phone number from an agent/chatbot
 */
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { phoneNumberId } = body;
    
    if (!phoneNumberId) {
      return NextResponse.json(
        { error: 'Missing required field: phoneNumberId' },
        { status: 400 }
      );
    }
    
    // Verify ownership
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        userId: session.user.id
      }
    });
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Use the phone number service to handle unassignment
    const phoneService = new PhoneNumberService();
    await phoneService.unassignPhoneNumber(phoneNumberId);
    
    logger.info('Phone number unassigned via API', {
      userId: session.user.id,
      phoneNumberId
    }, 'phone-assign-api');
    
    return NextResponse.json({
      success: true,
      message: 'Phone number unassigned and webhooks removed successfully'
    });
    
  } catch (error) {
    logger.error('Error unassigning phone number', {
      error: error.message
    }, 'phone-assign-api');
    
    return NextResponse.json(
      { error: error.message || 'Failed to unassign phone number' },
      { status: 500 }
    );
  }
} 