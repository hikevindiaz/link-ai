import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/user/voices - Get all voices for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userVoices = await db.user.findUnique({
      where: { id: user.id },
      select: {
        voices: {
          orderBy: { addedOn: 'desc' }
        }
      }
    });
    
    // Map database records to expected format for the frontend
    const voices = (userVoices?.voices || []).map(voice => ({
      id: voice.id,
      voice_id: voice.voiceId,
      name: voice.name,
      language: voice.language,
      labels: voice.labels ? JSON.parse(JSON.stringify(voice.labels)) : {},
      addedOn: voice.addedOn.toISOString(),
    }));
    
    return NextResponse.json({ voices });
  } catch (error) {
    console.error('Error fetching user voices:', error);
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
}

// POST /api/user/voices - Add a voice to the user's collection
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const { voice } = await request.json();
    
    if (!voice || !voice.voice_id || !voice.name) {
      return NextResponse.json({ error: 'Invalid voice data' }, { status: 400 });
    }
    
    // Use a transaction to check and create
    const userVoice = await db.$transaction(async (tx) => {
      // Check if voice already exists for this user
      const existingVoice = await tx.userVoice.findFirst({
        where: {
          userId: user.id,
          voiceId: voice.voice_id
        }
      });
      
      if (existingVoice) {
        throw new Error('Voice already exists');
      }
      
      // Create the voice
      return tx.userVoice.create({
        data: {
          userId: user.id,
          voiceId: voice.voice_id,
          name: voice.name,
          language: voice.language || null,
          labels: voice.labels || null,
          addedOn: new Date(),
        }
      });
    }).catch(err => {
      if (err.message === 'Voice already exists') {
        return null;
      }
      throw err;
    });
    
    if (!userVoice) {
      return NextResponse.json({ error: 'Voice already added' }, { status: 409 });
    }
    
    return NextResponse.json({
      success: true,
      voice: {
        id: userVoice.id,
        voice_id: userVoice.voiceId,
        name: userVoice.name,
        language: userVoice.language,
        labels: userVoice.labels ? JSON.parse(JSON.stringify(userVoice.labels)) : {},
        addedOn: userVoice.addedOn.toISOString()
      }
    });
  } catch (error) {
    console.error('Error adding user voice:', error);
    return NextResponse.json({ error: 'Failed to add voice' }, { status: 500 });
  }
} 