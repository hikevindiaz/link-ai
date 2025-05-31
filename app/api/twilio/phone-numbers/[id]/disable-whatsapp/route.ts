import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

// POST /api/twilio/phone-numbers/[id]/disable-whatsapp - Disable WhatsApp for a phone number
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
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number not found' 
      }, { status: 404 });
    }

    if (phoneNumber.userId !== session.user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 403 });
    }

    // Update phone number to disable WhatsApp
    const updated = await prisma.twilioPhoneNumber.update({
      where: { id: phoneNumberId },
      data: {
        whatsappEnabled: false,
        whatsappDisplayName: null,
        whatsappBusinessId: null,
        whatsappConfiguredAt: null,
        updatedAt: new Date()
      } as any // Type assertion for new fields
    });

    console.log(`[WhatsApp] Disabled WhatsApp for phone number ${phoneNumber.phoneNumber}`);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp disabled successfully',
      phoneNumber: {
        id: updated.id,
        number: updated.phoneNumber,
        whatsappEnabled: false,
        whatsappDisplayName: null,
        whatsappBusinessId: null
      }
    });

  } catch (error) {
    console.error('[WhatsApp] Error disabling WhatsApp:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to disable WhatsApp' 
    }, { status: 500 });
  }
} 