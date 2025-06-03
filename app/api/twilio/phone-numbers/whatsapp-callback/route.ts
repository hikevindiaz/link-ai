import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/phone-numbers?error=oauth_failed', req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/phone-numbers?error=missing_params', req.url)
      );
    }

    // Decode the state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (error) {
      console.error('Error decoding state:', error);
      return NextResponse.redirect(
        new URL('/dashboard/phone-numbers?error=invalid_state', req.url)
      );
    }

    const { phoneNumberId, userId, phoneNumber } = stateData;

    // Verify the phone number belongs to the user
    const phoneNumberRecord = await prisma.twilioPhoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        userId: userId,
      },
    });

    if (!phoneNumberRecord) {
      return NextResponse.redirect(
        new URL('/dashboard/phone-numbers?error=phone_not_found', req.url)
      );
    }

    // Exchange the code for an access token
    const tokenResponse = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        code: code,
        redirect_uri: process.env.META_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        new URL('/dashboard/phone-numbers?error=token_exchange_failed', req.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get the WABA ID from the token
    const wabaResponse = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.META_APP_SECRET!}`, // Use app secret for debug_token
        },
      }
    );

    if (!wabaResponse.ok) {
      console.error('WABA debug fetch failed:', await wabaResponse.text());
      return NextResponse.redirect(
        new URL('/dashboard/phone-numbers?error=waba_debug_failed', req.url)
      );
    }

    const wabaDebugData = await wabaResponse.json();
    
    // Look for whatsapp_business_management scope in granular_scopes
    const granularScopes = wabaDebugData.data?.granular_scopes || [];
    const whatsappScope = granularScopes.find((scope: any) => 
      scope.scope === 'whatsapp_business_management'
    );
    
    const wabaId = whatsappScope?.target_ids?.[0];

    if (!wabaId) {
      console.error('No WABA found in token debug response:', wabaDebugData);
      return NextResponse.redirect(
        new URL('/dashboard/phone-numbers?error=no_waba_found', req.url)
      );
    }

    // Now register the phone number with Twilio using the WABA
    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      // Enable WhatsApp for this phone number in Twilio
      // Note: This is where you would configure the phone number for WhatsApp
      // The actual Twilio setup may require different API calls depending on your setup
      
      // Update the database first
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: {
          whatsappEnabled: true,
          whatsappBusinessId: wabaId,
          whatsappDisplayName: `LinkAI ${phoneNumber}`,
          whatsappConfiguredAt: new Date(),
        },
      });

      // Redirect to success page
      return NextResponse.redirect(
        new URL(`/dashboard/phone-numbers/${phoneNumberId}?whatsapp_success=true`, req.url)
      );

    } catch (twilioError) {
      console.error('Twilio WhatsApp setup error:', twilioError);
      
      // Still update the database with the WABA info even if Twilio setup fails
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: {
          whatsappEnabled: true,
          whatsappBusinessId: wabaId,
          whatsappDisplayName: `LinkAI ${phoneNumber}`,
          whatsappConfiguredAt: new Date(),
        },
      });

      return NextResponse.redirect(
        new URL(`/dashboard/phone-numbers/${phoneNumberId}?whatsapp_partial=true`, req.url)
      );
    }

  } catch (error) {
    console.error('WhatsApp callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/phone-numbers?error=callback_failed', req.url)
    );
  }
} 