import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import twilio from 'twilio';

// Initialize Twilio client with main account credentials
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

/**
 * Gets the auth token for a subaccount
 * This endpoint should be called internally only as it handles sensitive credentials
 */
export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { subaccountSid } = await req.json();
    
    if (!subaccountSid) {
      return NextResponse.json({ success: false, error: 'Subaccount SID is required' }, { status: 400 });
    }

    // Fetch the subaccount details
    const subaccount = await twilioClient.api.accounts(subaccountSid).fetch();
    
    // The auth token is included in the account details when fetched with main account credentials
    // We'll return it so it can be stored securely with the phone number
    return NextResponse.json({ 
      success: true,
      subaccountSid: subaccount.sid,
      authToken: subaccount.authToken,
      friendlyName: subaccount.friendlyName
    });
    
  } catch (error) {
    console.error('Error fetching subaccount auth token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subaccount auth token' },
      { status: 500 }
    );
  }
} 