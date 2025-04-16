import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import twilio from 'twilio';

// Get main account credentials once
const mainAccountSid = process.env.TWILIO_ACCOUNT_SID;
const mainAuthToken = process.env.TWILIO_AUTH_TOKEN;

// Main account client (might still be needed for listing numbers without SID?)
// const twilioMainClient = twilio(mainAccountSid, mainAuthToken);

// This endpoint forces a refresh of all phone number statuses for a user
// It's particularly useful when phone numbers are incorrectly showing as suspended
export async function POST(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get user and check for a DEFAULT payment method
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        paymentMethods: { // Fetch ONLY the default PM
            where: { isDefault: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a default payment method (consistent check)
    const hasDefaultPaymentMethod = user.paymentMethods.length > 0;
    console.log(`[Refresh Statuses] User: ${userId}, Found Default PM in DB: ${hasDefaultPaymentMethod}`);
    
    // Get all phone numbers for the user, INCLUDING the user's subaccount SID
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      where: { userId },
      include: { 
        user: { // Include user data to get subaccount SID
          select: { twilioSubaccountSid: true }
        }
      }
    });
    
    // Update status for all phone numbers
    const updatedPhoneNumbers = [];
    console.log(`[Refresh Statuses] Processing ${phoneNumbers.length} numbers for user ${userId}...`); // Log start

    for (const phone of phoneNumbers) {
      let initialDbStatus = phone.status;
      let twilioSidToCheck = phone.twilioSid;
      const subaccountSid = phone.user.twilioSubaccountSid; // Get the subaccount SID for this number
      
      console.log(`[Refresh Statuses] --- Checking Number: ${phone.phoneNumber}, Subaccount: ${subaccountSid}, Initial DB Status: ${initialDbStatus}, DB SID: ${twilioSidToCheck} ---`); // Log number start
      
      let newStatus = initialDbStatus; // Start with current DB status
      
      // --- Logic based on Payment Method --- 
      if (!hasDefaultPaymentMethod) {
          if (phone.status !== 'pending') { 
             newStatus = 'suspended';
             console.log(`[Refresh Statuses] Status set to 'suspended' (No Default PM).`);
          }
      } else {
         if (phone.status === 'suspended') { 
             newStatus = 'active'; // Tentatively reactivate
             console.log(`[Refresh Statuses] Status tentatively set to 'active' (Default PM found, was suspended).`);
         } else {
             console.log(`[Refresh Statuses] Status remains '${newStatus}' (Default PM found, wasn't suspended).`);
         }
      }
      
      // --- Logic based on Twilio Verification (using SUBACCOUNT) --- 
      if (twilioSidToCheck && subaccountSid) { // Check if we have both SIDs
        try {
          console.log(`[Refresh Statuses] Verifying SID ${twilioSidToCheck} with Twilio using Subaccount ${subaccountSid}...`);
          // Create a client SPECIFICALLY for the subaccount
          const subaccountClient = twilio(mainAccountSid, mainAuthToken, { accountSid: subaccountSid }); 
          await subaccountClient.incomingPhoneNumbers(twilioSidToCheck).fetch();
          console.log(`[Refresh Statuses] Twilio verification successful for SID ${twilioSidToCheck} in subaccount ${subaccountSid}. Status remains '${newStatus}'.`);
          // Number exists on Twilio. Status determined above is likely okay.
        } catch (twilioError: any) {
          if (twilioError.status === 404) {
             console.warn(`[Refresh Statuses] Phone number SID ${twilioSidToCheck} NOT FOUND in subaccount ${subaccountSid}.`);
          } else {
             console.warn(`[Refresh Statuses] Phone number ${phone.phoneNumber} error on Twilio fetch (SID ${twilioSidToCheck}, Subaccount ${subaccountSid}):`, twilioError.message);
          }
          newStatus = 'suspended'; // Force suspend if not found or other error
          console.log(`[Refresh Statuses] Status forced to 'suspended' (Twilio fetch error/not found in subaccount).`);
        }
      } else if (!twilioSidToCheck && hasDefaultPaymentMethod && subaccountSid) {
         // No SID in DB, but has payment method & subaccount. Try to find on Twilio within the subaccount.
         console.log(`[Refresh Statuses] No SID in DB for ${phone.phoneNumber}. Checking Twilio by number in Subaccount ${subaccountSid}...`);
         try {
            const subaccountClient = twilio(mainAccountSid, mainAuthToken, { accountSid: subaccountSid });
            const numbers = await subaccountClient.incomingPhoneNumbers.list({ phoneNumber: phone.phoneNumber, limit: 1 });
            if (numbers && numbers.length > 0) {
               const foundNumber = numbers[0];
               console.log(`[Refresh Statuses] Found number ${phone.phoneNumber} on Twilio (SID: ${foundNumber.sid}). Updating DB SID and setting status to active.`);
               newStatus = 'active'; 
               await prisma.twilioPhoneNumber.update({ where: { id: phone.id }, data: { twilioSid: foundNumber.sid } });
               twilioSidToCheck = foundNumber.sid; 
             } else {
               console.log(`[Refresh Statuses] Number ${phone.phoneNumber} not found on Twilio in subaccount ${subaccountSid}.`);
               newStatus = 'suspended'; 
             }
         } catch (listError: any) {
            console.warn(`[Refresh Statuses] Error checking phone number ${phone.phoneNumber} existence on Twilio (Subaccount ${subaccountSid}):`, listError);
            newStatus = 'suspended'; 
         }
      } else {
          // No SID, or no Subaccount SID, or no default payment method -> ensure suspended
          if (!subaccountSid) console.warn(`[Refresh Statuses] Missing subaccount SID for user ${userId}. Cannot verify number ${phone.phoneNumber}. Forcing suspend.`);
          console.log(`[Refresh Statuses] Conditions not met for activation/verification for ${phone.phoneNumber}. Setting status to suspended.`);
          newStatus = 'suspended';
      }
      
      // Only update if the calculated status differs from current DB status
      console.log(`[Refresh Statuses] Final calculated status for ${phone.phoneNumber}: ${newStatus}. Initial DB status was: ${initialDbStatus}.`);
      if (newStatus !== initialDbStatus) {
         console.log(`[Refresh Statuses] Updating DB status for ${phone.phoneNumber} from ${initialDbStatus} to ${newStatus}.`);
         const updatedPhone = await prisma.twilioPhoneNumber.update({
          where: { id: phone.id },
          data: { status: newStatus },
        });
        updatedPhoneNumbers.push(updatedPhone);
      }
    }
    
    return NextResponse.json({
      success: true, 
      message: `Updated ${updatedPhoneNumbers.length} phone number(s)`,
      updatedPhoneNumbers: updatedPhoneNumbers.map(p => p.phoneNumber)
    });
  } catch (error) {
    console.error('Error refreshing phone number statuses:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to refresh phone number statuses' },
      { status: 500 }
    );
  }
} 