import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET handler to fetch vector documents for admin
export async function GET(req: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build query
    let query = supabase
      .from('vector_documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply search filter if provided
    if (searchQuery) {
      query = query.ilike('content', `%${searchQuery}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching vector documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vector documents', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documents: data || [],
      totalCount: count || 0,
    });
  } catch (error) {
    console.error('Error in admin vector documents API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a vector document
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get document ID from query params
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Delete the vector document
    const { error } = await supabase
      .from('vector_documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('Error deleting vector document:', error);
      return NextResponse.json(
        { error: 'Failed to delete vector document', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Vector document deleted' });
  } catch (error) {
    console.error('Error in admin vector documents delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 