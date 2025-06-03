import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/twilio/phone-numbers/[id]/disable-whatsapp - Disable WhatsApp for a phone number
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the phone number belongs to the user
    const phoneNumberRecord = await prisma.twilioPhoneNumber.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!phoneNumberRecord) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Disable WhatsApp for this phone number
    await prisma.$executeRaw`
      UPDATE "twilio_phone_numbers" 
      SET 
        "whatsappEnabled" = false,
        "whatsappBusinessId" = NULL,
        "whatsappDisplayName" = NULL,
        "whatsappConfiguredAt" = NULL
      WHERE id = ${params.id}
    `;

    return NextResponse.json({
      success: true,
      message: 'WhatsApp disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling WhatsApp:', error);
    return NextResponse.json(
      { error: 'Failed to disable WhatsApp' },
      { status: 500 }
    );
  }
} 