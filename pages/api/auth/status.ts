import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[Auth Status API] Request received:', req.headers.origin);
  
  // Set CORS headers to allow requests from the landing page
  // Accept requests from both www and non-www versions
  const allowedOrigins = [
    'https://getlinkai.com', 
    'https://www.getlinkai.com',
    'http://localhost:3000' // For local testing
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[Auth Status API] Handling OPTIONS preflight request');
    return res.status(200).end();
  }

  try {
    console.log('[Auth Status API] Getting server session...');
    const session = await getServerSession(req, res, authOptions);
    console.log('[Auth Status API] Session result:', !!session, 'User:', session?.user?.name || 'No user');
    
    // Dump cookies for debugging
    console.log('[Auth Status API] Request cookies:', req.cookies);
    
    return res.status(200).json({
      isLoggedIn: !!session,
      user: session ? {
        name: session.user?.name || '',
        email: session.user?.email || '',
      } : null,
      debug: {
        timestamp: new Date().toISOString(),
        cookiesPresent: Object.keys(req.cookies),
        requestedFrom: req.headers.origin || 'Unknown origin'
      }
    });
  } catch (error) {
    console.error('[Auth Status API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to check authentication status',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 