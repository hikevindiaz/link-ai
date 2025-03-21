import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import twilio from 'twilio';

// Initialize Twilio client with your main account credentials
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Schema for creating a subaccount
const createSubaccountSchema = z.object({
  friendlyName: z.string().optional(),
});

/**
 * Creates a Twilio subaccount for a user if they don't already have one
 */
export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, twilioSubaccountSid: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // If user already has a subaccount, return it
    if (user.twilioSubaccountSid) {
      // Verify subaccount exists in Twilio
      try {
        const subaccount = await twilioClient.api.accounts(user.twilioSubaccountSid).fetch();
        return NextResponse.json({ 
          success: true, 
          message: 'Subaccount already exists', 
          subaccountSid: user.twilioSubaccountSid,
          subaccount: {
            sid: subaccount.sid,
            friendlyName: subaccount.friendlyName,
            status: subaccount.status
          }
        });
      } catch (error) {
        // If the subaccount doesn't exist in Twilio, create a new one
        console.error("Subaccount exists in DB but not in Twilio:", error);
      }
    }

    // Parse request body
    const body = await req.json();
    const { friendlyName } = createSubaccountSchema.parse(body);

    // Create a new subaccount in Twilio
    const subaccount = await twilioClient.api.accounts.create({
      friendlyName: friendlyName || `${user.email} - ${new Date().toISOString()}`
    });

    // Update user with subaccount SID
    await db.user.update({
      where: { id: user.id },
      data: { twilioSubaccountSid: subaccount.sid }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Subaccount created successfully', 
      subaccountSid: subaccount.sid,
      subaccount: {
        sid: subaccount.sid,
        friendlyName: subaccount.friendlyName,
        status: subaccount.status
      }
    });
  } catch (error) {
    console.error('Error creating Twilio subaccount:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create Twilio subaccount' },
      { status: 500 }
    );
  }
}

/**
 * Gets the Twilio subaccount for the current user
 */
export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { twilioSubaccountSid: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.twilioSubaccountSid) {
      return NextResponse.json({ 
        success: true, 
        hasSubaccount: false,
        message: 'User does not have a Twilio subaccount' 
      });
    }

    // Get subaccount details from Twilio
    try {
      const subaccount = await twilioClient.api.accounts(user.twilioSubaccountSid).fetch();
      
      return NextResponse.json({ 
        success: true, 
        hasSubaccount: true,
        subaccountSid: user.twilioSubaccountSid,
        subaccount: {
          sid: subaccount.sid,
          friendlyName: subaccount.friendlyName,
          status: subaccount.status
        }
      });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch subaccount details'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error getting Twilio subaccount:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get Twilio subaccount' },
      { status: 500 }
    );
  }
} 