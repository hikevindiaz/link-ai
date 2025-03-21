import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema for route parameters
const routeParamsSchema = z.object({
  sourceId: z.string(),
});

// Schema for settings update
const settingsUpdateSchema = z.object({
  catalogMode: z.enum(['document', 'manual']).optional(),
  // Add other settings fields here as needed
});

// PATCH handler to update knowledge source settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    // Validate user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate route parameters
    const routeParams = routeParamsSchema.safeParse(params);
    if (!routeParams.success) {
      return NextResponse.json({ error: 'Invalid route parameters' }, { status: 400 });
    }

    const { sourceId } = routeParams.data;

    // Verify the knowledge source exists and belongs to the user
    const knowledgeSource = await db.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        userId: session.user.id,
      },
    });

    if (!knowledgeSource) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    // Parse and validate the request body
    const body = await request.json();
    const validatedBody = settingsUpdateSchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: validatedBody.error.format() 
      }, { status: 400 });
    }

    const updateData = validatedBody.data;

    // Update the knowledge source settings
    const updatedSource = await db.knowledgeSource.update({
      where: {
        id: sourceId,
      },
      data: {
        ...updateData
      },
    });

    return NextResponse.json({ 
      success: true, 
      source: updatedSource 
    });
  } catch (error) {
    console.error('Error updating knowledge source settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
} 