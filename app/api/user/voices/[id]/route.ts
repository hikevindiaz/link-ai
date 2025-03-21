import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// DELETE /api/user/voices/[id] - Remove a voice from the user's collection
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const voiceId = params.id;
    
    if (!voiceId) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
    }
    
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
    
    // First check if this is a database ID or an ElevenLabs voice_id
    let deleteQuery: any = { id: voiceId, userId: user.id };
    
    // If not found by ID, try by voiceId (ElevenLabs ID)
    const voiceRecord = await db.UserVoice.findUnique({
      where: { id: voiceId },
    });
    
    if (!voiceRecord) {
      deleteQuery = { voiceId: voiceId, userId: user.id };
    }
    
    // Delete the voice
    await db.UserVoice.deleteMany({
      where: deleteQuery
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user voice:', error);
    return NextResponse.json({ error: 'Failed to delete voice' }, { status: 500 });
  }
} 