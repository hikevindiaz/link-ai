import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updatePhoneNumberStatus } from '@/lib/phone-number-status';

// This endpoint should be called by a cron job daily
export async function GET(req: NextRequest) {
  try {
    // Verify this is being called by our cron service
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Running phone number status update job');

    // Update all phone number statuses based on payment status
    const allPhoneNumbers = await prisma.twilioPhoneNumber.findMany({
      select: { id: true }
    });

    console.log(`[Cron] Updating status for ${allPhoneNumbers.length} phone numbers`);

    let updated = 0;
    let errors = 0;

    for (const phoneNumber of allPhoneNumbers) {
      try {
        await updatePhoneNumberStatus(phoneNumber.id);
        updated++;
      } catch (error) {
        console.error(`[Cron] Error updating phone number ${phoneNumber.id}:`, error);
        errors++;
      }
    }

    console.log(`[Cron] Phone number status update job completed. Updated: ${updated}, Errors: ${errors}`);

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      processed: allPhoneNumbers.length,
      updated,
      errors
    });
  } catch (error) {
    console.error('[Cron] Error in phone number billing job:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 