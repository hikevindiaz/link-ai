import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import twilio from 'twilio';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

// Verify Twilio webhook signature
const validateTwilioRequest = (req: NextRequest, body: FormData): boolean => {
  // In production, validate signature using Twilio's validateRequest function
  if (process.env.NODE_ENV === 'production') {
    try {
      const twilioSignature = req.headers.get('x-twilio-signature');
      const url = process.env.NEXT_PUBLIC_APP_URL + '/api/twilio/sms';
      
      if (!twilioSignature || !process.env.TWILIO_AUTH_TOKEN) {
        console.error('Missing Twilio signature or auth token');
        return false;
      }
      
      // Convert FormData to plain object for validation
      const params: Record<string, string> = {};
      body.forEach((value, key) => {
        params[key] = value.toString();
      });
      
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        params
      );
      
      if (!isValid) {
        console.error('Invalid Twilio signature');
      }
      
      return isValid;
    } catch (error) {
      console.error('Error validating Twilio request:', error);
      return false;
    }
  }
  
  // Skip validation in development
  return true;
};

// Twilio webhook for handling incoming SMS messages
export async function POST(req: NextRequest) {
  console.log('SMS webhook called');
  
  try {
    // Parse the request body from Twilio (form data)
    const formData = await req.formData();
    
    // Validate the request is from Twilio
    if (!validateTwilioRequest(req, formData)) {
      console.error('Invalid Twilio request');
      return NextResponse.json(
        { error: 'Unauthorized request' },
        { status: 403 }
      );
    }
    
    const twilioData: Record<string, string> = {};
    
    // Convert FormData to a plain object
    formData.forEach((value, key) => {
      twilioData[key] = value.toString();
    });
    
    console.log('Received SMS webhook data:', twilioData);
    
    // Extract relevant fields from the Twilio request
    const {
      From: from,
      To: to,
      Body: body,
      MessageSid: messageSid
    } = twilioData;
    
    if (!from || !to || !body) {
      console.error('Missing required SMS webhook parameters');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Look up the phone number in our database
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: { phoneNumber: to },
      include: {
        user: true,
        chatbot: true
      }
    });
    
    if (!phoneNumber) {
      console.error('Phone number not found in database:', to);
      return NextResponse.json(
        { error: 'Phone number not registered' },
        { status: 404 }
      );
    }
    
    // Save the incoming message to database
    await prisma.message.create({
      data: {
        message: body,
        response: `Auto-response: Message received from ${from}`,
        threadId: `sms-${from}-${to}`, // Create a thread ID for SMS conversations
        from,
        userId: phoneNumber.userId,
        chatbotId: phoneNumber.chatbotId,
      }
    });
    
    // If there's a chatbot associated, process the message with it
    if (phoneNumber.chatbot) {
      // TODO: Process the message with the chatbot
      console.log('Message will be processed by chatbot:', phoneNumber.chatbot.id);
      
      // For now, just acknowledge receipt
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Thanks for your message. Our AI assistant will respond shortly.');
      
      return new NextResponse(twiml.toString(), {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
    
    // If no chatbot is assigned, just acknowledge receipt
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('This phone number is not configured with an AI assistant.');
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 