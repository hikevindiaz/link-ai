import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPhoneNumbersWithStatus } from '@/lib/phone-number-status';
import { db as prisma } from '@/lib/db';

// NEW SIMPLIFIED REFRESH ENDPOINT
// Uses our comprehensive Stripe-first status calculation
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
    console.log(`[Refresh] Starting status refresh for user: ${userId}`);
    
    // Get phone numbers with calculated status using our new system
    const phoneNumbersWithStatus = await getUserPhoneNumbersWithStatus(userId);
    
    // Update database status to match calculated status
    const updatedPhoneNumbers = [];
    
    for (const phoneNumber of phoneNumbersWithStatus) {
      const currentDbStatus = phoneNumber.status;
      const newCalculatedStatus = phoneNumber.calculatedStatus;
      
      // Update if the calculated status differs from database status
      if (currentDbStatus !== newCalculatedStatus) {
        console.log(`[Refresh] Updating ${phoneNumber.phoneNumber}: ${currentDbStatus} → ${newCalculatedStatus}`);
        
        await prisma.twilioPhoneNumber.update({
          where: { id: phoneNumber.id },
          data: { 
            status: newCalculatedStatus,
            updatedAt: new Date()
          }
        });
        
        updatedPhoneNumbers.push({
          phoneNumber: phoneNumber.phoneNumber,
          oldStatus: currentDbStatus,
          newStatus: newCalculatedStatus,
          reason: phoneNumber.statusReason
        });
      } else {
        console.log(`[Refresh] ${phoneNumber.phoneNumber} status unchanged: ${currentDbStatus}`);
      }
    }
    
    console.log(`[Refresh] Completed. Updated ${updatedPhoneNumbers.length} phone numbers.`);
    
    return NextResponse.json({
      success: true, 
      message: `Refreshed ${phoneNumbersWithStatus.length} phone number(s), updated ${updatedPhoneNumbers.length}`,
      phoneNumbers: phoneNumbersWithStatus.length,
      updated: updatedPhoneNumbers.length,
      details: updatedPhoneNumbers
    });
  } catch (error) {
    console.error('[Refresh] Error refreshing phone number statuses:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to refresh phone number statuses' },
      { status: 500 }
    );
  }
} 