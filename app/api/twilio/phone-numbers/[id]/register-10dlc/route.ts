import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import twilio from 'twilio';

// POST /api/twilio/phone-numbers/[id]/register-10dlc - Submit 10DLC registration
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const phoneNumberId = params.id;
    
    // Get phone number and verify ownership
    const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
      where: { id: phoneNumberId },
      include: { user: true }
    });

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number not found' }, { status: 404 });
    }

    if (phoneNumber.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already registered
    const phoneNumberData = phoneNumber as any; // Type assertion for a2p fields
    const a2pStatus = phoneNumberData.a2pRegistrationStatus || 'not_started';
    if (a2pStatus === 'approved') {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number is already verified' 
      }, { status: 400 });
    }

    if (a2pStatus === 'pending') {
      return NextResponse.json({ 
        success: false, 
        error: 'Registration is already in progress' 
      }, { status: 400 });
    }

    // Verify user has required business information
    if (!phoneNumber.user.companyName || !phoneNumber.user.addressLine1 || 
        !phoneNumber.user.city || !phoneNumber.user.state || !phoneNumber.user.postalCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Please complete your business information before submitting verification' 
      }, { status: 400 });
    }

    try {
      // Create Twilio client for the user's subaccount if they have one
      let twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID as string,
        process.env.TWILIO_AUTH_TOKEN as string
      );
      
      if (phoneNumber.user.twilioSubaccountSid) {
        twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID as string,
          process.env.TWILIO_AUTH_TOKEN as string,
          { accountSid: phoneNumber.user.twilioSubaccountSid }
        );
      }

      // For MVP, we'll use a simplified registration flow
      // In production, this would involve:
      // 1. Creating/retrieving a brand registration
      // 2. Creating a campaign
      // 3. Associating the phone number with the campaign
      
      // For now, we'll mark it as pending and simulate the registration process
      console.log('[10DLC] Starting registration for phone number:', phoneNumber.phoneNumber);
      
      // Update phone number status to pending
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: {
          ...({ a2pRegistrationStatus: 'pending' } as any),
          updatedAt: new Date()
        }
      });

      // In a real implementation, you would:
      // 1. Create a brand if not exists
      // 2. Create a campaign for appointment reminders
      // 3. Add the phone number to the campaign
      // 4. Set up webhooks to track registration status

      // For demo purposes, automatically approve after a delay
      setTimeout(async () => {
        try {
          await prisma.twilioPhoneNumber.update({
            where: { id: phoneNumberId },
            data: {
              ...({ 
                a2pRegistrationStatus: 'approved',
                a2pRegisteredAt: new Date()
              } as any),
              updatedAt: new Date()
            }
          });
          console.log('[10DLC] Auto-approved registration for demo:', phoneNumber.phoneNumber);
        } catch (error) {
          console.error('[10DLC] Error auto-approving registration:', error);
        }
      }, 5000); // 5 seconds for demo

      return NextResponse.json({
        success: true,
        message: 'Verification submitted successfully. You will be notified once approved.',
        status: 'pending'
      });

    } catch (twilioError: any) {
      console.error('[10DLC] Twilio error during registration:', twilioError);
      
      // Update status to requires_attention with error
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: {
          ...({ 
            a2pRegistrationStatus: 'requires_attention',
            a2pRegistrationError: twilioError.message || 'Registration failed'
          } as any),
          updatedAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: false, 
        error: 'Failed to submit verification. Please try again.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[10DLC] Error in registration endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process registration request' 
    }, { status: 500 });
  }
}

// GET /api/twilio/phone-numbers/[id]/register-10dlc - Check registration status
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const phoneNumberId = params.id;
    
    // Get phone number and verify ownership
    const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
      where: { id: phoneNumberId },
      select: {
        id: true,
        phoneNumber: true,
        ...({
          a2pRegistrationStatus: true,
          a2pRegistrationError: true,
          a2pRegisteredAt: true,
          a2pCampaignSid: true,
          a2pBrandSid: true,
        } as any),
        userId: true
      }
    }) as any; // Type assertion for result

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number not found' }, { status: 404 });
    }

    if (phoneNumber.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      registration: {
        status: phoneNumber?.a2pRegistrationStatus || 'not_started',
        error: phoneNumber?.a2pRegistrationError,
        registeredAt: phoneNumber?.a2pRegisteredAt,
        campaignSid: phoneNumber?.a2pCampaignSid,
        brandSid: phoneNumber?.a2pBrandSid
      }
    });

  } catch (error) {
    console.error('[10DLC] Error checking registration status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check registration status' 
    }, { status: 500 });
  }
} 