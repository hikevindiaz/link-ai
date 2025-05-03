import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const allowedOrigins = [
  'https://getlinkai.com',
  'https://www.getlinkai.com'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const session = await getServerSession(req, res, authOptions);
    return res.status(200).json({
      isLoggedIn: !!session,
      user: session && session.user?.name
        ? { firstName: session.user.name.split(' ')[0] }
        : null
    });
  } catch {
    return res.status(500).json({ isLoggedIn: false, user: null });
  }
} 