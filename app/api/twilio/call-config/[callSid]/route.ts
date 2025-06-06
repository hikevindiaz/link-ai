import { NextRequest, NextResponse } from 'next/server';
import { getCallConfig } from '@/lib/twilio/call-config';
import { logger } from '@/lib/logger';

// GET /api/twilio/call-config/[callSid]
// Retrieve call configuration for voice server
export async function GET(
  req: NextRequest,
  { params }: { params: { callSid: string } }
) {
  try {
    // Optional: Add authentication for internal API calls
    const authHeader = req.headers.get('authorization');
    const internalApiKey = process.env.INTERNAL_API_KEY;
    
    if (internalApiKey && authHeader !== `Bearer ${internalApiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { callSid } = params;
    
    if (!callSid) {
      return NextResponse.json(
        { error: 'Missing callSid parameter' },
        { status: 400 }
      );
    }
    
    // Retrieve configuration from database
    const config = await getCallConfig(callSid);
    
    if (!config) {
      logger.error('Call configuration not found', { callSid }, 'call-config-api');
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }
    
    logger.info('Call configuration retrieved', { 
      callSid, 
      agentId: config.agentId 
    }, 'call-config-api');
    
    return NextResponse.json(config);
    
  } catch (error) {
    logger.error('Error retrieving call configuration', { 
      error, 
      callSid: params.callSid 
    }, 'call-config-api');
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 