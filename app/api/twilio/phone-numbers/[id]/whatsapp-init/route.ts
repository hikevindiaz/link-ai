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

    const { phoneNumber } = await req.json();

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

    // Create state parameter with phone number info
    const state = Buffer.from(JSON.stringify({
      phoneNumberId: params.id,
      userId: session.user.id,
      phoneNumber: phoneNumber
    })).toString('base64');

    // Build the Meta Embedded Signup URL
    // Note: You need to create a Facebook Business Login Configuration first
    // and get the config_id from Facebook Developer Console
    const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    authUrl.searchParams.set('client_id', process.env.META_APP_ID!);
    authUrl.searchParams.set('config_id', process.env.META_CONFIG_ID!); // You need to create this configuration
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI!);
    authUrl.searchParams.set('state', state);
    
    // These extras are crucial for WhatsApp Embedded Signup
    authUrl.searchParams.set('extras', JSON.stringify({
      feature: 'whatsapp_embedded_signup',
      version: 2,
    }));

    return NextResponse.json({ 
      success: true, 
      authUrl: authUrl.toString() 
    });

  } catch (error) {
    console.error('Error initializing WhatsApp setup:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize WhatsApp setup' 
    }, { status: 500 });
  }
} 