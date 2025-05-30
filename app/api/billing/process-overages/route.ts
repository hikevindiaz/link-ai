import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processOverageCharges } from '@/lib/usage-tracking';

// POST /api/billing/process-overages - Process overage charges for all users
export async function POST(req: NextRequest) {
  try {
    // Check for admin authorization or cron job token
    const authHeader = req.headers.get('authorization');
    const cronToken = req.headers.get('x-cron-token');
    
    // Verify this is either an admin user or a valid cron job
    if (cronToken) {
      // Verify cron token
      if (cronToken !== process.env.CRON_SECRET_TOKEN) {
        return NextResponse.json({ error: 'Invalid cron token' }, { status: 401 });
      }
    } else {
      // Verify admin user session
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Check if user is admin (you may want to add admin role checking)
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
      if (!adminEmails.includes(session.user.email)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    console.log('[Overage Processing API] Starting overage charge processing...');
    
    const result = await processOverageCharges();
    
    console.log(`[Overage Processing API] Completed. Processed: ${result.processed}, Errors: ${result.errors.length}`);
    
    return NextResponse.json({
      success: true,
      message: 'Overage processing completed',
      result: {
        processed: result.processed,
        errorCount: result.errors.length,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('[Overage Processing API] Error processing overages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process overages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/billing/process-overages - Get status of last overage processing
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // For now, return a simple status
    // In the future, you might want to track overage processing history
    return NextResponse.json({
      success: true,
      status: 'ready',
      message: 'Overage processing is available',
      lastProcessed: null, // You could track this in the database
      nextScheduled: null  // If you have scheduled processing
    });

  } catch (error) {
    console.error('[Overage Processing API] Error getting status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get overage processing status' },
      { status: 500 }
    );
  }
} 