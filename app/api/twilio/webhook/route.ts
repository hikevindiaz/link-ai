import { NextRequest, NextResponse } from 'next/server';
import { AgentRuntime, ChannelContext } from '@/lib/agent-runtime';
import { WhatsAppAdapter } from '@/lib/agent-runtime/channels/whatsapp-adapter';
import { SMSAdapter } from '@/lib/agent-runtime/channels/sms-adapter';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import twilio from 'twilio';

/**
 * Unified Twilio webhook for SMS and WhatsApp messages
 * Automatically detects the channel type and processes accordingly
 */
export async function POST(req: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await req.formData();
    const twilioData: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      twilioData[key] = value.toString();
    });
    
    logger.info('Twilio webhook received', { 
      from: twilioData.From,
      to: twilioData.To 
    }, 'twilio-webhook');
    
    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const twilioSignature = req.headers.get('x-twilio-signature');
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook`;
      
      if (!twilioSignature || !process.env.TWILIO_AUTH_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        twilioData
      );
      
      if (!isValid) {
        logger.error('Invalid Twilio signature', {}, 'twilio-webhook');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }
    
    // Determine channel type
    const isWhatsApp = twilioData.From?.startsWith('whatsapp:') || twilioData.To?.startsWith('whatsapp:');
    const channelType = isWhatsApp ? 'whatsapp' : 'sms';
    
    // Clean phone numbers
    const fromNumber = twilioData.From?.replace('whatsapp:', '');
    const toNumber = twilioData.To?.replace('whatsapp:', '');
    
    // Find the agent by phone number
    const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: { 
        phoneNumber: toNumber,
        ...(isWhatsApp ? { whatsappEnabled: true } : {})
      },
      include: {
        chatbot: {
          include: {
            model: true,
            knowledgeSources: true
          }
        }
      }
    });
    
    if (!phoneNumber?.chatbot) {
      logger.error('No agent found for phone number', { 
        to: toNumber,
        channelType 
      }, 'twilio-webhook');
      
      // Send error response
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Sorry, this number is not configured to receive messages.');
      
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }
    
    const agent = phoneNumber.chatbot;
    
    // Check if channel is enabled
    if (channelType === 'whatsapp' && !agent.whatsappEnabled) {
      logger.error('WhatsApp not enabled for agent', { agentId: agent.id }, 'twilio-webhook');
      return new NextResponse('WhatsApp not enabled', { status: 403 });
    }
    
    if (channelType === 'sms' && !agent.smsEnabled) {
      logger.error('SMS not enabled for agent', { agentId: agent.id }, 'twilio-webhook');
      return new NextResponse('SMS not enabled', { status: 403 });
    }
    
    // Create agent runtime
    const runtime = await AgentRuntime.fromChatbotId(agent.id);
    
    // Create appropriate adapter
    const adapter = channelType === 'whatsapp' 
      ? new WhatsAppAdapter() 
      : new SMSAdapter();
    
    await adapter.initialize(agent);
    
    // Create channel context
    const threadId = `${channelType}-${fromNumber}-${Date.now()}`;
    const channelContext: ChannelContext = {
      type: channelType,
      sessionId: `${channelType}-${fromNumber}`,
      userId: agent.userId,
      chatbotId: agent.id,
      threadId,
      phoneNumber: fromNumber,
      capabilities: channelType === 'whatsapp' ? {
        supportsAudio: true,
        supportsVideo: true,
        supportsImages: true,
        supportsFiles: true,
        supportsRichText: true,
        supportsTypingIndicator: true,
        supportsDeliveryReceipts: true,
        supportsInterruption: false,
        maxMessageLength: 4096
      } : {
        supportsAudio: false,
        supportsVideo: false,
        supportsImages: false,
        supportsFiles: false,
        supportsRichText: false,
        supportsTypingIndicator: false,
        supportsDeliveryReceipts: false,
        supportsInterruption: false,
        maxMessageLength: 160
      },
      metadata: {
        messageSid: twilioData.MessageSid,
        phoneNumber: fromNumber,
        agentPhoneNumber: toNumber
      }
    };
    
    // Process incoming message
    const userMessage = await adapter.handleIncoming(twilioData as any, channelContext);
    const response = await runtime.processMessage(userMessage, channelContext);
    
    // Send response
    await adapter.sendOutgoing(response, channelContext);
    
    // Return empty response (Twilio doesn't expect content)
    return new NextResponse('', { status: 200 });
    
  } catch (error) {
    logger.error('Error processing Twilio webhook', { 
      error: error.message 
    }, 'twilio-webhook');
    
    // Return error response
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, an error occurred processing your message.');
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
} 