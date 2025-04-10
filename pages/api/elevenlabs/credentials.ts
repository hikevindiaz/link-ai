import { NextApiRequest, NextApiResponse } from 'next';
// import { auth } from '../../auth'; // Try relative path assuming auth.ts is at root
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/lib/auth'; // Import your auth options

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // const session = await auth(req, res); // Get session using next-auth helper
  const session = await getServerSession(req, res, authOptions); // Use getServerSession

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('ElevenLabs API key is not configured.');
    return res.status(500).json({ error: 'Internal Server Error: API key not configured.' });
  }

  // Return only the API key
  res.status(200).json({ apiKey });
} 