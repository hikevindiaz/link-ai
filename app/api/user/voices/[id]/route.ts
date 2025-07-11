import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: {
    id: string;
  };
}

// DELETE /api/user/voices/[id] - Delete a user's voice
export async function DELETE(request: Request, { params }: RouteParams) {
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
    
    const voiceId = params.id;
    
    if (!voiceId) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
    }
    
    // Check if the voice exists and belongs to the user
    const existingVoice = await db.userVoice.findFirst({
      where: {
        id: voiceId,
        userId: user.id
      }
    });
    
    if (!existingVoice) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
    }
    
    // Delete the voice
    await db.userVoice.delete({
      where: {
        id: voiceId
      }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting voice:', error);
    return NextResponse.json({ 
      error: 'Failed to delete voice',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/user/voices/[id] - Update a user's voice
export async function PUT(request: Request, { params }: RouteParams) {
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
    
    const voiceId = params.id;
    const { name, description, language, isDefault } = await request.json();
    
    if (!voiceId) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
    }
    
    // Check if the voice exists and belongs to the user
    const existingVoice = await db.userVoice.findFirst({
      where: {
        id: voiceId,
        userId: user.id
      }
    });
    
    if (!existingVoice) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
    }
    
    // Use transaction for updates, especially if setting as default
    const updatedVoice = await db.$transaction(async (tx) => {
      // If setting as default, unset any existing default
      if (isDefault && !existingVoice.isDefault) {
        await tx.userVoice.updateMany({
          where: {
            userId: user.id,
            isDefault: true,
            NOT: {
              id: voiceId
            }
          },
          data: {
            isDefault: false
          }
        });
      }
      
      // Update the voice
      return tx.userVoice.update({
        where: {
          id: voiceId
        },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(language !== undefined && { language: language?.trim() || null }),
          ...(isDefault !== undefined && { isDefault }),
        }
      });
    });
    
    return NextResponse.json({
      voice: {
        id: updatedVoice.id,
        name: updatedVoice.name,
        elevenLabsVoiceId: updatedVoice.elevenLabsVoiceId,
        description: updatedVoice.description,
        language: updatedVoice.language,
        isDefault: updatedVoice.isDefault,
        addedOn: updatedVoice.addedOn.toISOString(),
      }
    });
    
  } catch (error) {
    console.error('Error updating voice:', error);
    return NextResponse.json({ 
      error: 'Failed to update voice',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 