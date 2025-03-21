import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';
import { TwimlResponse } from 'twilio/lib/twiml/TwimlResponse';

// POST /api/twilio/sms - Handle incoming SMS
export async function POST(req: NextRequest) {
  try {
    // Parse the Twilio request
    const formData = await req.formData();
    
    // Get essential parameters
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const accountSid = formData.get('AccountSid') as string;
    
    // Log the incoming message
    console.log(`Incoming SMS from ${from} to ${to}: ${body}`);
    
    // Look up the phone number in our database
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        phoneNumber: to,
      },
      include: {
        user: true,
        chatbot: true,
      },
    });
    
    if (!phoneNumber) {
      console.log(`Phone number ${to} not found in database`);
      return createTwimlResponse('Sorry, this number is not configured to receive messages.');
    }
    
    // Look up the user who owns this Twilio subaccount
    const user = await prisma.user.findFirst({
      where: {
        twilioSubaccountSid: accountSid,
      },
    });
    
    if (!user && phoneNumber.user.twilioSubaccountSid !== accountSid) {
      console.log(`User for subaccount ${accountSid} not found`);
      return createTwimlResponse('Unauthorized request.');
    }
    
    // Check if the phone number is linked to a chatbot
    if (phoneNumber.chatbot) {
      // Create a message thread for this conversation if it doesn't exist
      let threadId = '';
      
      // Store the incoming message
      await prisma.message.create({
        data: {
          message: body,
          response: 'Processing...',
          threadId,
          from,
          userId: phoneNumber.userId,
          chatbotId: phoneNumber.chatbotId as string,
        },
      });
      
      // Pass the message to the agent for processing
      // This would normally be an async process, with the response sent later
      // For now, we'll return a simple acknowledgment
      return createTwimlResponse('Your message has been received. The agent will respond shortly.');
    } else {
      // No chatbot assigned to this number
      return createTwimlResponse('This number is not configured with an agent to respond to messages.');
    }
  } catch (error) {
    console.error('Error handling SMS webhook:', error);
    return createTwimlResponse('An error occurred processing your message.');
  }
}

function createTwimlResponse(message: string): NextResponse {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(message);
  
  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
} 