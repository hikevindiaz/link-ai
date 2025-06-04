import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PhoneNumberService } from '@/lib/twilio/phone-number-service';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

/**
 * GET /api/phone-numbers/webhooks?phoneNumberId=xxx
 * Verify webhook configuration for a phone number
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get phoneNumberId from query params
    const url = new URL(req.url);
    const phoneNumberId = url.searchParams.get('phoneNumberId');
    
    if (!phoneNumberId) {
      return NextResponse.json(
        { error: 'Missing phoneNumberId parameter' },
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
    
    // Verify webhook configuration
    const phoneService = new PhoneNumberService();
    const verification = await phoneService.verifyPhoneNumberWebhooks(phoneNumberId);
    
    logger.info('Webhook verification completed', {
      userId: session.user.id,
      phoneNumberId,
      configured: verification.configured
    }, 'webhook-verify-api');
    
    return NextResponse.json({
      phoneNumber: phoneNumber.phoneNumber,
      ...verification
    });
    
  } catch (error) {
    logger.error('Error verifying webhooks', {
      error: error.message
    }, 'webhook-verify-api');
    
    return NextResponse.json(
      { error: error.message || 'Failed to verify webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/phone-numbers/webhooks
 * Update webhook configuration for a phone number
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
    
    // Update webhooks
    const phoneService = new PhoneNumberService();
    await phoneService.updatePhoneNumberWebhooks(phoneNumberId);
    
    logger.info('Webhooks updated', {
      userId: session.user.id,
      phoneNumberId
    }, 'webhook-update-api');
    
    return NextResponse.json({
      success: true,
      message: 'Webhooks updated successfully'
    });
    
  } catch (error) {
    logger.error('Error updating webhooks', {
      error: error.message
    }, 'webhook-update-api');
    
    return NextResponse.json(
      { error: error.message || 'Failed to update webhooks' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/phone-numbers/webhooks
 * Batch update webhooks for all phone numbers
 */
export async function PUT(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Optional: Check if user is admin or has special permissions
    // For now, we'll allow any authenticated user to update their own webhooks
    
    // Parse optional filters from body
    const body = await req.json();
    const { chatbotId } = body;
    
    // If chatbotId is provided, verify ownership
    if (chatbotId) {
      const chatbot = await prisma.chatbot.findFirst({
        where: {
          id: chatbotId,
          userId: session.user.id
        }
      });
      
      if (!chatbot) {
        return NextResponse.json(
          { error: 'Chatbot not found or unauthorized' },
          { status: 404 }
        );
      }
    }
    
    // Get all user's phone numbers
    const userPhoneCount = await prisma.twilioPhoneNumber.count({
      where: {
        userId: session.user.id,
        chatbotId: chatbotId || { not: null },
        status: 'active'
      }
    });
    
    if (userPhoneCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active phone numbers to update',
        results: { success: 0, failed: 0, errors: [] }
      });
    }
    
    // Perform batch update
    const phoneService = new PhoneNumberService();
    const results = await phoneService.updateAllWebhooks();
    
    logger.info('Batch webhook update completed', {
      userId: session.user.id,
      ...results
    }, 'webhook-batch-api');
    
    return NextResponse.json({
      success: true,
      message: `Updated webhooks for ${results.success} phone numbers`,
      results
    });
    
  } catch (error) {
    logger.error('Error in batch webhook update', {
      error: error.message
    }, 'webhook-batch-api');
    
    return NextResponse.json(
      { error: error.message || 'Failed to batch update webhooks' },
      { status: 500 }
    );
  }
} 