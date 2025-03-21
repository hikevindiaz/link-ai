import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';

// POST /api/twilio/voice - Handle incoming voice calls
export async function POST(req: NextRequest) {
  try {
    // Parse the Twilio request
    const formData = await req.formData();
    
    // Get essential parameters
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;
    const accountSid = formData.get('AccountSid') as string;
    
    // Log the incoming call
    console.log(`Incoming call from ${from} to ${to}`);
    
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
      return createTwimlResponse('Sorry, this number is not configured to receive calls.');
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
      const chatbot = phoneNumber.chatbot;
      
      // Initialize TwiML response
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Check if the chatbot has voice capabilities
      if (chatbot.voice) {
        // Gather input from the caller
        const gather = twiml.gather({
          input: 'speech',
          action: `/api/twilio/voice/process?chatbotId=${chatbot.id}&phoneNumberId=${phoneNumber.id}`,
          method: 'POST',
          speechTimeout: 'auto',
          language: chatbot.language || 'en-US',
        });
        
        // Add welcome message
        gather.say({
          voice: chatbot.voice,
        }, chatbot.welcomeMessage || "Hello! How can I help you today?");
        
        // If they don't say anything
        twiml.redirect('/api/twilio/voice/process?timeout=true');
      } else {
        // No voice capabilities configured
        twiml.say(
          "This number's agent is not configured for voice calls. Please send a text message instead."
        );
        twiml.hangup();
      }
      
      return new NextResponse(twiml.toString(), {
        headers: {
          'Content-Type': 'text/xml',
        },
      });
    } else {
      // No chatbot assigned to this number
      return createTwimlResponse('This number is not configured with an agent to handle calls.');
    }
  } catch (error) {
    console.error('Error handling voice webhook:', error);
    return createTwimlResponse('An error occurred processing your call.');
  }
}

function createTwimlResponse(message: string): NextResponse {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(message);
  twiml.hangup();
  
  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
} 