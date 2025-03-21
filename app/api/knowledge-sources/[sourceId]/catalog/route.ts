import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { put } from '@vercel/blob';

// Schema for route parameters
const routeParamsSchema = z.object({
  sourceId: z.string(),
});

// GET handler to fetch catalog content
export async function GET(
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

    // Fetch catalog content
    const catalogContent = await db.catalogContent.findFirst({
      where: {
        knowledgeSourceId: sourceId,
      },
      include: {
        file: true,
        products: true,
      },
    });

    return NextResponse.json(catalogContent);
  } catch (error) {
    console.error('Error fetching catalog content:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog content' }, { status: 500 });
  }
}

// POST handler to upload a catalog file
export async function POST(
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const instructions = formData.get('instructions') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const validExtensions = ['.csv', '.pdf', '.xlsx', '.docx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.some(ext => fileExtension.endsWith(ext))) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a CSV, PDF, Excel, or Word file' }, { status: 400 });
    }

    // Check if catalog content already exists
    const existingCatalogContent = await db.catalogContent.findFirst({
      where: {
        knowledgeSourceId: sourceId,
      },
      include: {
        file: true,
      },
    });

    // If there's an existing file, store its ID to delete it later
    let oldFileId = null;
    if (existingCatalogContent?.file) {
      oldFileId = existingCatalogContent.file.id;
    }

    // Upload file to Vercel Blob
    const timestamp = Date.now();
    const fileName = `catalog_${sourceId}_${timestamp}_${file.name}`;
    
    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
    });

    // Create a new file record - IMPORTANT: Do NOT set knowledgeSourceId here
    // This ensures the file doesn't show up in the general file list
    const newFile = await db.file.create({
      data: {
        userId: session.user.id,
        name: file.name,
        openAIFileId: `catalog_${timestamp}`, // Prefix with 'catalog_' to identify catalog files
        blobUrl: blob.url, // Use the URL from Vercel Blob
        // knowledgeSourceId is intentionally NOT set here
      },
    });

    // Create or update catalog content
    let catalogContent;
    if (existingCatalogContent) {
      catalogContent = await db.catalogContent.update({
        where: {
          id: existingCatalogContent.id,
        },
        data: {
          instructions: instructions || undefined,
          fileId: newFile.id,
        },
        include: {
          file: true,
          products: true,
        },
      });
    } else {
      catalogContent = await db.catalogContent.create({
        data: {
          knowledgeSourceId: sourceId,
          instructions: instructions || undefined,
          fileId: newFile.id,
        },
        include: {
          file: true,
          products: true,
        },
      });
    }

    // Delete the old file if it exists
    if (oldFileId) {
      try {
        await db.file.delete({
          where: {
            id: oldFileId,
          },
        });
      } catch (deleteError) {
        console.error('Error deleting old file:', deleteError);
        // Continue with the process even if file deletion fails
      }
    }

    return NextResponse.json(catalogContent);
  } catch (error) {
    console.error('Error uploading catalog file:', error);
    return NextResponse.json({ error: 'Failed to upload catalog file' }, { status: 500 });
  }
} 