import { NextRequest, NextResponse } from 'next/server';
import { createVote, getVotesForThread } from '@/lib/chat-interface/adapters';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');
    
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }
    
    const votes = await getVotesForThread(threadId);
    return NextResponse.json(votes);
  } catch (error) {
    console.error('Error retrieving votes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messageId, threadId, value } = await req.json();
    
    if (!messageId || !threadId || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate value is either 1 or -1
    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: 'Value must be 1 or -1' }, { status: 400 });
    }
    
    const vote = await createVote({
      messageId,
      threadId,
      value: value as 1 | -1
    });
    
    return NextResponse.json(vote);
  } catch (error) {
    console.error('Error creating vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 