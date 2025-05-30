import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';

export async function POST(req: NextRequest) {
  console.log('Voice hangup webhook called');
  
  try {
    // Extract agentId and threadId from URL query parameters
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    const threadId = url.searchParams.get('threadId');
    
    console.log(`Processing hangup for agentId: ${agentId}, threadId: ${threadId}`);
    
    // Fetch the agent/chatbot details if available
    let hangUpMessage = "Thank you for calling. Goodbye.";
    
    if (agentId) {
      const agent = await prisma.chatbot.findUnique({
        where: { id: agentId }
      });
      
      if (agent?.hangUpMessage) {
        hangUpMessage = agent.hangUpMessage;
      }
    }
    
    // Record the call ending in the database if we have a threadId
    if (threadId) {
      try {
        await prisma.message.create({
          data: {
            threadId,
            message: 'Call ended',
            response: hangUpMessage,
            from: 'system',
            userId: agentId ? (await prisma.chatbot.findUnique({ where: { id: agentId } }))?.userId || '' : '',
            chatbotId: agentId || '',
          }
        });
        console.log(`Recorded call ending in thread ${threadId}`);
      } catch (dbError) {
        console.error('Error recording call ending:', dbError);
        // Continue even if recording fails
      }
    }
    
    // Create a TwiML response that gracefully ends the call
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(hangUpMessage);
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    console.error('Error processing hangup webhook:', error);
    
    // Even if there's an error, create a simple goodbye message
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Goodbye.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
} 