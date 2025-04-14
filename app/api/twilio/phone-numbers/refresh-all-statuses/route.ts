import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import twilio from 'twilio';

// Initialize Twilio client
const twilioMainClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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
    
    // Get user with payment methods
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        paymentMethods: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a valid payment method
    const hasValidPaymentMethod = 
      user.paymentMethods.length > 0 || 
      ['active', 'trialing', 'beta_active'].includes(user.stripeSubscriptionStatus || '') ||
      Boolean(user.stripeCustomerId);
    
    // Get all phone numbers for the user
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      where: { userId },
    });
    
    // Update status for all phone numbers
    const updatedPhoneNumbers = [];
    for (const phone of phoneNumbers) {
      let newStatus = phone.status;
      
      // First check if the number is valid in Twilio
      if (phone.twilioSid) {
        try {
          // Attempt to fetch the phone number from Twilio
          await twilioMainClient.incomingPhoneNumbers(phone.twilioSid).fetch();
          // If we got here, the number exists in Twilio
          
          // If hasValidPaymentMethod is false, still mark as suspended
          newStatus = hasValidPaymentMethod ? 'active' : 'suspended';
        } catch (twilioError) {
          // If we can't find the number in Twilio, mark it as suspended
          console.warn(`Phone number ${phone.phoneNumber} not found in Twilio or error occurred:`, twilioError);
          newStatus = 'suspended';
        }
      } else if (hasValidPaymentMethod) {
        // If no twilioSid but valid payment, let's check with Twilio by the phone number
        try {
          // List incoming phone numbers filtered by the phone number
          const numbers = await twilioMainClient.incomingPhoneNumbers.list({
            phoneNumber: phone.phoneNumber
          });
          
          if (numbers && numbers.length > 0) {
            // Found the number in Twilio - update the sid and mark as active
            const foundNumber = numbers[0];
            newStatus = 'active';
            
            // Update the twilioSid in our database
            await prisma.twilioPhoneNumber.update({
              where: { id: phone.id },
              data: { twilioSid: foundNumber.sid },
            });
          } else {
            newStatus = 'suspended';
          }
        } catch (listError) {
          console.warn(`Error checking phone number ${phone.phoneNumber} in Twilio:`, listError);
          newStatus = 'suspended';
        }
      } else {
        // No twilioSid and no valid payment method, mark as suspended
        newStatus = 'suspended';
      }
      
      // Only update if the status changed
      if (newStatus !== phone.status) {
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