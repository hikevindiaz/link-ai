import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

// POST /api/twilio/phone-numbers/[id]/configure-whatsapp - Configure WhatsApp for a phone number
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
    const body = await req.json();
    const { displayName, businessId } = body;

    if (!displayName || !displayName.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Display name is required' 
      }, { status: 400 });
    }
    
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

    // Update phone number with WhatsApp configuration
    const updated = await prisma.twilioPhoneNumber.update({
      where: { id: phoneNumberId },
      data: {
        whatsappEnabled: true,
        whatsappDisplayName: displayName.trim(),
        whatsappBusinessId: businessId ? businessId.trim() : null,
        whatsappConfiguredAt: new Date(),
        updatedAt: new Date()
      } as any // Type assertion for new fields
    });

    console.log(`[WhatsApp] Configured WhatsApp for phone number ${phoneNumber.phoneNumber}`);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp configured successfully',
      phoneNumber: {
        id: updated.id,
        number: updated.phoneNumber,
        whatsappEnabled: true,
        whatsappDisplayName: displayName.trim(),
        whatsappBusinessId: businessId || null
      }
    });

  } catch (error) {
    console.error('[WhatsApp] Error configuring WhatsApp:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to configure WhatsApp' 
    }, { status: 500 });
  }
} 