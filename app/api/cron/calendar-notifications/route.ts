import { NextRequest, NextResponse } from 'next/server';
import { scheduleAppointmentReminders, autoCancelUnconfirmedAppointments } from '@/lib/calendar-sms';

// This endpoint should be called by a cron job every 5-10 minutes
export async function GET(req: NextRequest) {
  try {
    // Verify this is being called by our cron service (e.g., Vercel Cron)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Running calendar notifications job');

    // Run both tasks in parallel
    await Promise.all([
      scheduleAppointmentReminders(),
      autoCancelUnconfirmedAppointments()
    ]);

    console.log('[Cron] Calendar notifications job completed');

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('[Cron] Error in calendar notifications job:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 