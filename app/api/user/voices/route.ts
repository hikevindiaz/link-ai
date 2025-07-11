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
      name: voice.name,
      elevenLabsVoiceId: voice.elevenLabsVoiceId,
      description: voice.description,
      language: voice.language,
      isDefault: voice.isDefault,
      addedOn: voice.addedOn.toISOString(),
    }));
    
    return NextResponse.json({ voices });
  } catch (error) {
    console.error('Error fetching user voices:', error);
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
}

// POST /api/user/voices - Add a new ElevenLabs voice to user's collection
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
    
    const { name, elevenLabsVoiceId, description, language, isDefault } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Voice name is required' }, { status: 400 });
    }
    
    if (!elevenLabsVoiceId?.trim()) {
      return NextResponse.json({ error: 'ElevenLabs voice ID is required' }, { status: 400 });
    }
    
    // Use a transaction to check and create
    const userVoice = await db.$transaction(async (tx) => {
      // Check if voice name already exists for this user
      const existingVoice = await tx.userVoice.findFirst({
        where: {
          userId: user.id,
          name: name.trim()
        }
      });
      
      if (existingVoice) {
        throw new Error('Voice name already exists');
      }
      
      // Check if this ElevenLabs voice is already added
      const existingElevenLabsVoice = await tx.userVoice.findFirst({
        where: {
          userId: user.id,
          elevenLabsVoiceId: elevenLabsVoiceId.trim()
        }
      });
      
      if (existingElevenLabsVoice) {
        throw new Error('This voice is already in your collection');
      }
      
      // If this is being set as default, unset any existing default
      if (isDefault) {
        await tx.userVoice.updateMany({
          where: {
            userId: user.id,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }
      
      // Create the voice
      return tx.userVoice.create({
        data: {
          userId: user.id,
          name: name.trim(),
          elevenLabsVoiceId: elevenLabsVoiceId.trim(),
          description: description?.trim() || null,
          language: language?.trim() || null,
          isDefault: isDefault || false,
          addedOn: new Date(),
        }
      });
    }).catch(err => {
      if (err.message === 'Voice name already exists' || err.message === 'This voice is already in your collection') {
        return null;
      }
      throw err;
    });
    
    if (!userVoice) {
      return NextResponse.json({ error: 'Voice name already exists or voice is already in your collection' }, { status: 409 });
    }
    
    return NextResponse.json({
      voice: {
        id: userVoice.id,
        name: userVoice.name,
        elevenLabsVoiceId: userVoice.elevenLabsVoiceId,
        description: userVoice.description,
        language: userVoice.language,
        isDefault: userVoice.isDefault,
        addedOn: userVoice.addedOn.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error adding voice:', error);
    return NextResponse.json({ 
      error: 'Failed to add voice',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 