import { NextRequest, NextResponse } from 'next/server';
import { getVotesForThread, createVote } from '@/lib/chat-interface/adapters';

// GET endpoint to retrieve votes for a thread
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');
    
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }
    
    const votes = await getVotesForThread(threadId);
    return NextResponse.json({ votes });
  } catch (error) {
    console.error('Error retrieving votes:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to create a vote
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messageId, threadId, value } = body;
    
    if (!messageId || !threadId || (value !== 1 && value !== -1)) {
      return NextResponse.json({ 
        error: 'Invalid request. Required fields: messageId, threadId, value (1 or -1)'
      }, { status: 400 });
    }
    
    const vote = await createVote({ messageId, threadId, value });
    return NextResponse.json({ vote });
  } catch (error) {
    console.error('Error creating vote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 