import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // TODO: In a real implementation, you would:
    // 1. Check with Twilio/Meta if the WhatsApp registration was completed
    // 2. Use the Twilio Senders API to create the WhatsApp sender
    // 3. Store the WABA ID and other details

    // For demonstration, we'll simulate a successful setup
    // In production, this would involve calling Twilio's API
    
    // Note: The WhatsApp fields exist in the database schema but TypeScript types might not be generated
    // Run 'npx prisma generate' to update types if needed
    const updatedPhoneNumber = await prisma.$executeRaw`
      UPDATE "twilio_phone_numbers" 
      SET 
        "whatsappEnabled" = true,
        "whatsappBusinessId" = ${`WABA_${Date.now()}`},
        "whatsappDisplayName" = ${'Your Business'},
        "whatsappConfiguredAt" = ${new Date()}
      WHERE id = ${params.id}
    `;

    // Fetch the updated record
    const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      phoneNumber: {
        id: phoneNumber?.id,
        // @ts-ignore - WhatsApp fields exist in DB but types might not be generated
        whatsappEnabled: phoneNumber?.whatsappEnabled || false,
        // @ts-ignore
        whatsappBusinessId: phoneNumber?.whatsappBusinessId,
        // @ts-ignore
        whatsappDisplayName: phoneNumber?.whatsappDisplayName,
      }
    });
  } catch (error) {
    console.error('Error verifying WhatsApp setup:', error);
    return NextResponse.json(
      { error: 'Failed to verify WhatsApp setup' },
      { status: 500 }
    );
  }
} 