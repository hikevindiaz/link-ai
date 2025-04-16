import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import twilio from 'twilio';

// Get main account credentials
const mainAccountSid = process.env.TWILIO_ACCOUNT_SID;
const mainAuthToken = process.env.TWILIO_AUTH_TOKEN;

// DELETE /api/twilio/phone-numbers/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const phoneNumberId = params.id;

    if (!phoneNumberId) {
      return NextResponse.json({ success: false, error: 'Phone number ID is required' }, { status: 400 });
    }

    // Find the phone number record, including the user's subaccount SID
    const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
      where: {
        id: phoneNumberId,
        userId, // Ensure the number belongs to the current user
      },
      include: {
        user: { // Include user to get subaccount SID
          select: { twilioSubaccountSid: true }
        }
      }
    });

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number not found or does not belong to user' }, { status: 404 });
    }

    const phoneSid = phoneNumber.twilioSid;
    const subaccountSid = phoneNumber.user.twilioSubaccountSid;

    // Attempt to delete from Twilio first using the SUBACCOUNT client
    if (phoneSid && subaccountSid) {
      try {
        console.log(`Attempting to delete SID ${phoneSid} from Twilio Subaccount ${subaccountSid}...`);
        // Create a client specifically for the subaccount
        const subaccountClient = twilio(mainAccountSid, mainAuthToken, { accountSid: subaccountSid });
        await subaccountClient.incomingPhoneNumbers(phoneSid).remove();
        console.log(`Successfully deleted SID ${phoneSid} from Twilio Subaccount ${subaccountSid}.`);
      } catch (error) {
        // Log the error but proceed to delete from local DB anyway
        // Important: Decide if failure to delete from Twilio should prevent local deletion
        console.error(`Error deleting phone number SID ${phoneSid} from Twilio Subaccount ${subaccountSid}:`, error);
        // Optionally return an error here if Twilio deletion is critical
        // return NextResponse.json({ success: false, error: 'Failed to delete number from provider' }, { status: 500 });
      }
    } else {
       console.warn(`Cannot delete from Twilio for DB ID ${phoneNumberId}: Missing Twilio SID (${phoneSid}) or Subaccount SID (${subaccountSid}). Proceeding with local delete.`);
    }

    // Delete from local database
    await prisma.twilioPhoneNumber.delete({
      where: {
        id: phoneNumberId,
      },
    });

    console.log(`Successfully deleted phone number with DB ID ${phoneNumberId} from local database.`);
    return NextResponse.json({ success: true, message: 'Phone number deleted successfully' });

  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 