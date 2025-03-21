import { NextRequest, NextResponse } from 'next/server';
import { createDocument, getDocumentsForThread } from '@/lib/chat-interface/adapters';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Document or thread ID is required' }, { status: 400 });
    }
    
    // If the ID looks like a thread ID, get all documents for that thread
    if (id.startsWith('thread_')) {
      const documents = await getDocumentsForThread(id);
      return NextResponse.json(documents);
    } 
    
    // Otherwise, we'll assume it's a single document ID and handle accordingly
    // This would need to be implemented in the adapters
    return NextResponse.json({ error: 'Getting individual documents is not implemented yet' }, { status: 501 });
  } catch (error) {
    console.error('Error retrieving documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, kind, threadId } = await req.json();
    
    if (!title || !threadId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const document = await createDocument({
      threadId,
      title,
      content: content || '',
      kind: (kind as 'text' | 'code' | 'image' | 'sheet') || 'text'
    });
    
    return NextResponse.json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 