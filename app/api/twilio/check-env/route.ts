import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Only allow in development or with a secret query param
  const secret = req.nextUrl.searchParams.get('secret');
  
  if (process.env.NODE_ENV !== 'development' && secret !== 'check-twilio-env-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET',
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    vercelUrl: process.env.VERCEL_URL || 'NOT SET',
    timestamp: new Date().toISOString()
  });
} 