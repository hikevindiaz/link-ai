import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import twilio from 'twilio';

// Initialize Twilio client
const twilioMainClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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
    
    // Find the phone number in the database to get the Twilio SID
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        userId: userId,
      },
    });
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }
    
    // Check if we have a Twilio SID
    if (!phoneNumber.twilioSid) {
      return NextResponse.json({ error: 'No Twilio ID associated with this phone number' }, { status: 400 });
    }
    
    // Call Twilio API to get the current status of the phone number
    try {
      const twilioPhoneNumber = await twilioMainClient.incomingPhoneNumbers(phoneNumber.twilioSid).fetch();
      
      // Map Twilio status to our status
      // Note: Twilio's API doesn't have a direct "status" field for phone numbers
      // Instead, we might infer status from other properties or from subscription status
      // For this example, we'll assume the phone number is active if we can fetch it
      const status = twilioPhoneNumber ? 'active' : 'suspended';
      
      // Update the phone number status in our database
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: { 
          status,
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Phone number status refreshed successfully',
        status,
      });
    } catch (twilioError) {
      console.error('Error fetching phone number from Twilio:', twilioError);
      
      // If we can't reach Twilio or the number doesn't exist there anymore, mark as suspended
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: { 
          status: 'suspended',
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Phone number marked as suspended due to Twilio error',
        status: 'suspended',
      });
    }
  } catch (error) {
    console.error('Error refreshing phone number status:', error);
    return NextResponse.json({ error: 'Failed to refresh phone number status' }, { status: 500 });
  }
} 