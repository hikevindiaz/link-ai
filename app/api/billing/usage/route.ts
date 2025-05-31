import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  trackUsage, 
  getUsageSummary, 
  checkUsageLimit,
  UsageType 
} from '@/lib/usage-tracking';
import { z } from 'zod';

// Schema for tracking usage
const trackUsageSchema = z.object({
  usageType: z.enum(['message', 'sms', 'web_search', 'conversation_summary', 'whatsapp_conversation', 'voice_minute']),
  quantity: z.number().min(1).default(1),
  metadata: z.record(z.any()).optional()
});

// Schema for checking usage limits
const checkLimitSchema = z.object({
  usageType: z.enum(['message', 'sms', 'web_search', 'conversation_summary', 'whatsapp_conversation', 'voice_minute'])
});

// GET /api/billing/usage - Get usage summary for current billing period
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    const summary = await getUsageSummary(userId);
    
    return NextResponse.json({ 
      success: true, 
      data: summary 
    });
    
  } catch (error) {
    console.error('Error fetching usage summary:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch usage summary', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

// POST /api/billing/usage - Track usage or check limits
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'track';

    if (action === 'track') {
      // Track usage
      const validatedData = trackUsageSchema.parse(body);
      
      console.log(`[Usage API] Tracking ${validatedData.usageType} usage for user: ${userId}`);
      
      await trackUsage(
        userId, 
        validatedData.usageType as UsageType, 
        validatedData.quantity, 
        validatedData.metadata
      );
      
      return NextResponse.json({
        success: true,
        message: `Tracked ${validatedData.quantity} ${validatedData.usageType}(s)`
      });

    } else if (action === 'check-limit') {
      // Check usage limit
      const validatedData = checkLimitSchema.parse(body);
      
      console.log(`[Usage API] Checking ${validatedData.usageType} limit for user: ${userId}`);
      
      const limitCheck = await checkUsageLimit(userId, validatedData.usageType as UsageType);
      
      return NextResponse.json({
        success: true,
        limitCheck: {
          usageType: validatedData.usageType,
          withinLimit: limitCheck.withinLimit,
          usage: limitCheck.usage,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining,
          utilizationPercentage: limitCheck.limit ? Math.round((limitCheck.usage / limitCheck.limit) * 100) : null
        }
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "track" or "check-limit"' },
        { status: 400 }
      );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[Usage API] Error processing request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process usage request' },
      { status: 500 }
    );
  }
}

// PUT /api/billing/usage - Bulk track usage (for batch operations)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    
    const bulkUsageSchema = z.object({
      usageRecords: z.array(z.object({
        usageType: z.enum(['message', 'sms', 'web_search', 'conversation_summary', 'whatsapp_conversation', 'voice_minute']),
        quantity: z.number().min(1).default(1),
        metadata: z.record(z.any()).optional()
      }))
    });

    const validatedData = bulkUsageSchema.parse(body);
    
    console.log(`[Usage API] Bulk tracking ${validatedData.usageRecords.length} usage records for user: ${userId}`);
    
    // Track all usage records
    const results = await Promise.allSettled(
      validatedData.usageRecords.map(record => 
        trackUsage(userId, record.usageType as UsageType, record.quantity, record.metadata)
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Bulk tracking completed. Successful: ${successful}, Failed: ${failed}`,
      results: {
        successful,
        failed,
        total: validatedData.usageRecords.length
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[Usage API] Error processing bulk usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process bulk usage' },
      { status: 500 }
    );
  }
} 