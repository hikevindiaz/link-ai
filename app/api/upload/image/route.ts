import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Upload to Supabase
    const userId = session.user.id;
    const uploadResult = await uploadToSupabase(file, 'products', 'catalog', userId);

    if (!uploadResult) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Return the URL
    return NextResponse.json({ 
      url: uploadResult.url,
      path: uploadResult.path
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

// Replace with new App Router configuration
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Set max duration to handle large file uploads - 30 seconds
export const maxDuration = 30; 