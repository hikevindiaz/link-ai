import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';

// Verify Twilio webhook signature
const validateTwilioRequest = (req: NextRequest, body: FormData): boolean => {
  // In production, validate signature using Twilio's validateRequest function
  if (process.env.NODE_ENV === 'production') {
    try {
      const twilioSignature = req.headers.get('x-twilio-signature');
      const url = process.env.NEXT_PUBLIC_APP_URL + '/api/twilio/voice';
      
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

// Twilio webhook for handling incoming voice calls
export async function POST(req: NextRequest) {
  console.log('Voice webhook called');
  
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
    
    console.log('Received voice webhook data:', twilioData);
    
    // Extract relevant fields from the Twilio request
    const {
      From: from,
      To: to,
      CallSid: callSid
    } = twilioData;
    
    if (!from || !to) {
      console.error('Missing required voice webhook parameters');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Look up the phone number in our database
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: { phoneNumber: to },
      include: {
        chatbot: true
      }
    });
    
    if (!phoneNumber) {
      console.error('Phone number not found in database:', to);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, this number is not configured to receive calls.');
      twiml.hangup();
      
      return new NextResponse(twiml.toString(), {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
    
    // If there's a chatbot associated, start a voice conversation
    if (phoneNumber.chatbot) {
      console.log('Call will be handled by chatbot:', phoneNumber.chatbot.id);
      
      const twiml = new twilio.twiml.VoiceResponse();
      
      // For now, just provide a simple response
      twiml.say('Hello! This is an AI assistant. I\'m not fully configured yet, but will be available soon.');
      twiml.pause({ length: 1 });
      twiml.say('Thank you for calling. Goodbye.');
      twiml.hangup();
      
      return new NextResponse(twiml.toString(), {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
    
    // If no chatbot is assigned, play a message and hang up
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('This phone number is not configured with an AI assistant to handle voice calls.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
    
  } catch (error) {
    console.error('Error processing voice webhook:', error);
    
    // Return a TwiML response with an error message
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, an error occurred processing your call.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
} 