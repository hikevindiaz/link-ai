import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers to allow requests from the landing page
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
    return res.status(200).end();
  }

  try {
    // Just return all cookies for debugging
    return res.status(200).json({
      cookies: req.cookies,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        'user-agent': req.headers['user-agent']
      },
      session: await getServerSession(req, res, authOptions),
      message: 'This is a test endpoint to check cookie sharing'
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Error in test cookie endpoint',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 