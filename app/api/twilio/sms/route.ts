import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import twilio from 'twilio';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';
import { processAppointmentSMSReply } from '@/lib/calendar-sms';

// Verify Twilio webhook signature
const validateTwilioRequest = (req: NextRequest, body: FormData, authToken?: string): boolean => {
  // In production, validate signature using Twilio's validateRequest function
  if (process.env.NODE_ENV === 'production') {
    try {
      const twilioSignature = req.headers.get('x-twilio-signature');
      const url = req.url;
      
      // Use provided auth token or fall back to environment variable
      const validationToken = authToken || process.env.TWILIO_AUTH_TOKEN;
      
      if (!twilioSignature || !validationToken) {
        console.error('Missing Twilio signature or auth token');
        return false;
      }
      
      // Convert FormData to plain object for validation
      const params: Record<string, string> = {};
      body.forEach((value, key) => {
        params[key] = value.toString();
      });
      
      const isValid = twilio.validateRequest(
        validationToken,
        twilioSignature,
        url,
        params
      );
      
      if (!isValid) {
        console.error('[SMS Validation] Signature validation failed for URL:', url);
        
        // Try without query parameters as a fallback
        const baseUrl = url.split('?')[0];
        const baseValid = twilio.validateRequest(
          validationToken,
          twilioSignature,
          baseUrl,
          params
        );
        
        if (baseValid) {
          console.log('[SMS Validation] Validation succeeded with base URL');
          return true;
        }
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
    
    // Convert FormData to a plain object first to extract the To number
    const twilioData: Record<string, string> = {};
    formData.forEach((value, key) => {
      twilioData[key] = value.toString();
    });
    
    // Extract the "To" number to look up auth token
    const toNumber = twilioData.To;
    let phoneNumberAuthToken: string | undefined;
    
    if (toNumber) {
      const phoneNumberRecord = await prisma.twilioPhoneNumber.findFirst({
        where: { phoneNumber: toNumber },
        select: { subaccountAuthToken: true, subaccountSid: true }
      });
      
      if (phoneNumberRecord) {
        phoneNumberAuthToken = phoneNumberRecord.subaccountAuthToken || undefined;
        console.log('[SMS Validation] Found phone number with subaccount:', phoneNumberRecord.subaccountSid || 'None');
      }
    }
    
    // Validate the request is from Twilio using the appropriate auth token
    if (!validateTwilioRequest(req, formData, phoneNumberAuthToken)) {
      console.error('Invalid Twilio request');
      return NextResponse.json(
        { error: 'Unauthorized request' },
        { status: 403 }
      );
    }
    
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
      // Check if this might be an appointment confirmation reply
      const messageUpper = body.toUpperCase().trim();
      if (messageUpper === 'YES' || messageUpper === 'Y' || 
          messageUpper === 'NO' || messageUpper === 'N' || 
          messageUpper === 'CANCEL' ||
          body.match(/ID:\s*[A-Za-z0-9]{6}/i)) {
        
        // Process as appointment confirmation
        const replyMessage = await processAppointmentSMSReply(from, body, to);
        
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message(replyMessage);
        
        return new NextResponse(twiml.toString(), {
          headers: {
            'Content-Type': 'text/xml'
          }
        });
      }
      
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