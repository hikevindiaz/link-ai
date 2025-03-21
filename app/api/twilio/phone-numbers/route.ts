import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { TwilioPhoneNumber, Chatbot } from '@prisma/client';
import Stripe from 'stripe';
import { formatDate, addMonths } from '@/lib/date-utils';
import twilio from 'twilio';

type PhoneNumberWithChatbot = TwilioPhoneNumber & {
  chatbot: Chatbot | null;
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

// Initialize Twilio client with your main account credentials
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// GET /api/twilio/phone-numbers - Get all phone numbers for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Check payment method status first - this addresses the issue where phone numbers
    // would appear suspended if payment method verification was broken
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        paymentMethods: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a valid payment method either:
    // 1. They have payment methods stored in our database
    // 2. They have a valid Stripe subscription 
    // 3. They have a Stripe customer ID (which means they've added a payment method before)
    const hasValidPaymentMethod = 
      user.paymentMethods.length > 0 || 
      ['active', 'trialing', 'beta_active'].includes(user.stripeSubscriptionStatus || '') ||
      Boolean(user.stripeCustomerId);

    // Get all phone numbers for the current user
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      where: {
        userId,
      },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Format phone numbers for the frontend, ensuring correct status is set
    const formattedPhoneNumbers = phoneNumbers.map((phone) => {
      // If the phone number is already active and user has a valid payment method,
      // keep it active; otherwise, respect the current status
      const status = (phone.status === 'active' && !hasValidPaymentMethod) 
        ? 'suspended' 
        : phone.status;

      return {
        id: phone.id,
        number: phone.phoneNumber,
        agentId: phone.chatbotId,
        agentName: phone.chatbot?.name || null,
        boughtOn: phone.purchasedAt.toISOString(),
        renewsOn: phone.renewalDate.toISOString(),
        monthlyFee: `$${phone.monthlyPrice.toString()}`,
        status,
        twilioSid: phone.twilioSid as string | undefined,
      };
    });
    
    return NextResponse.json({ phoneNumbers: formattedPhoneNumbers });
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// The shape of the request body for creating a phone number
const createPhoneNumberSchema = z.object({
  phoneNumber: z.string(),
  country: z.string(),
  monthlyPrice: z.number(),
});

// POST /api/twilio/phone-numbers - Purchase a new phone number
export async function POST(req: NextRequest) {
  // Declare invoice variable outside the try blocks
  let invoice;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get request body
    const body = await req.json();
    const { phoneNumber, agentId, monthlyPrice, country } = body;
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    
    if (!monthlyPrice) {
      return NextResponse.json({ error: 'Monthly price is required' }, { status: 400 });
    }
    
    // Check if user has a valid payment method
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { paymentMethods: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'You need to set up a payment method before purchasing a phone number' },
        { status: 400 }
      );
    }
    
    if (user.paymentMethods.length === 0) {
      return NextResponse.json(
        { error: 'You need to add a payment method before purchasing a phone number' },
        { status: 400 }
      );
    }
    
    // Check if the user already has this phone number
    const existingNumber = await prisma.twilioPhoneNumber.findFirst({
      where: {
        phoneNumber,
        userId,
      },
    });
    
    if (existingNumber) {
      return NextResponse.json(
        { error: 'You already own this phone number' },
        { status: 400 }
      );
    }

    // Default payment method for this customer
    const defaultPaymentMethod = user.paymentMethods.find(pm => pm.isDefault) || user.paymentMethods[0];
    
    try {
      // Create a payment intent for the phone number purchase
      // This is a one-time charge for purchasing the phone number
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(monthlyPrice.toString()) * 100), // Convert to cents
        currency: 'usd',
        customer: user.stripeCustomerId,
        payment_method: defaultPaymentMethod.stripePaymentMethodId,
        off_session: true, // Since we're charging without the customer present
        confirm: true, // Confirm the payment immediately
        description: `Phone number purchase: ${phoneNumber}`,
        metadata: {
          userId,
          phoneNumber,
          type: 'phone_number_purchase',
        },
      });
      
      // If payment succeeds, proceed with Twilio purchase
      if (paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded. Purchasing phone number:', phoneNumber);
        
        // Get or create a Twilio subaccount for the user
        let subaccountSid = user.twilioSubaccountSid;
        
        if (!subaccountSid) {
          // Create a new subaccount via our API
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/twilio/subaccount`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': req.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              friendlyName: `${user.email || userId} - ${new Date().toISOString()}`
            }),
          });
          
          const data = await response.json();
          
          if (!data.success || !data.subaccountSid) {
            throw new Error('Failed to create Twilio subaccount');
          }
          
          subaccountSid = data.subaccountSid;
          
          // Update user with new subaccount SID
          await prisma.user.update({
            where: { id: userId },
            data: { twilioSubaccountSid: subaccountSid }
          });
        }
        
        // Create a Twilio client for the subaccount
        const subaccountClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
          { accountSid: subaccountSid }
        );
        
        // Purchase the phone number using the subaccount client
        const purchasedNumber = await subaccountClient.incomingPhoneNumbers.create({
          phoneNumber,
          smsUrl: `${process.env.NEXTAUTH_URL}/api/twilio/sms`, // Optional: Set up SMS webhook
          voiceUrl: `${process.env.NEXTAUTH_URL}/api/twilio/voice`, // Optional: Set up voice webhook
        });
        
        console.log('Purchased number:', purchasedNumber.sid);
        
        // Calculate renewal date (1 month from now)
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        
        // Save the phone number to the database
        const newPhoneNumber = await prisma.twilioPhoneNumber.create({
          data: {
            phoneNumber,
            twilioSid: purchasedNumber.sid,
            country: country || 'US',
            monthlyPrice: parseFloat(monthlyPrice.toString()),
            status: 'active',
            purchasedAt: new Date(),
            renewalDate,
            user: {
              connect: {
                id: userId,
              },
            },
            ...(agentId
              ? {
                  chatbot: {
                    connect: {
                      id: agentId,
                    },
                  },
                }
              : {}),
          },
        });
        
        // Create an invoice record for the purchase
        invoice = await prisma.invoice.create({
          data: {
            stripePaymentIntentId: paymentIntent.id,
            amount: parseFloat(monthlyPrice.toString()),
            status: 'paid',
            description: `Purchase of phone number ${phoneNumber}`,
            type: 'purchase',
            userId,
            twilioPhoneNumberId: newPhoneNumber.id,
          },
        });
        
        // Continue with existing subscription logic...

        return NextResponse.json({ 
          success: true, 
          message: 'Phone number purchased successfully',
          phoneNumber: newPhoneNumber 
        });
      }
    } catch (error) {
      console.error('Error charging payment method:', error);
      
      // Now we can safely check invoice since it's defined in the outer scope
      if (invoice) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'failed' }
        });
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to purchase phone number' 
    }, { status: 500 });
  } catch (error) {
    console.error('Error purchasing phone number:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purchase phone number' },
      { status: 500 }
    );
  }
}

// GET endpoint to list phone numbers
export async function GET_LIST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get phone numbers associated with the user
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      where: { userId: user.id },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response
    const formattedPhoneNumbers = phoneNumbers.map((number) => ({
      id: number.id,
      number: number.phoneNumber,
      twilioSid: number.twilioSid,
      agentId: number.chatbotId || null,
      agentName: number.chatbot?.name || null,
      country: number.country,
      boughtOn: formatDate(number.purchasedAt),
      renewsOn: formatDate(number.renewalDate),
      monthlyFee: `$${number.monthlyPrice}`,
      status: number.status,
    }));

    return NextResponse.json({
      success: true,
      phoneNumbers: formattedPhoneNumbers,
    });
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}

// POST endpoint to purchase a phone number
export async function POST_PURCHASE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a payment method
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { success: false, message: 'No payment method found. Please add a payment method in settings.' },
        { status: 400 }
      );
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No payment method found. Please add a payment method in settings.' },
        { status: 400 }
      );
    }

    // Parse request body
    const { phoneNumber, chatbotId } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Check if chatbot exists if chatbotId is provided
    if (chatbotId) {
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId, userId: user.id },
      });

      if (!chatbot) {
        return NextResponse.json(
          { success: false, message: 'Chatbot not found or does not belong to the user' },
          { status: 404 }
        );
      }

      // Check if chatbot already has a phone number
      const existingPhoneNumber = await prisma.twilioPhoneNumber.findFirst({
        where: { chatbotId },
      });

      if (existingPhoneNumber) {
        return NextResponse.json(
          { success: false, message: 'This chatbot already has a phone number assigned. Please unassign it first.' },
          { status: 400 }
        );
      }
    }

    // Check if the phone number is already purchased by the user
    const existingPhoneNumber = await prisma.twilioPhoneNumber.findFirst({
      where: { phoneNumber },
    });

    if (existingPhoneNumber) {
      return NextResponse.json(
        { success: false, message: 'This phone number is already purchased' },
        { status: 400 }
      );
    }

    // Purchase phone number from Twilio
    let twilioResponse;
    try {
      twilioResponse = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber,
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, message: error.message || 'Failed to purchase phone number from Twilio' },
        { status: 500 }
      );
    }

    // Create the phone number record in our database
    const monthlyPrice = 7.99; // Base price for phone numbers
    const renewalDate = addMonths(new Date(), 1);

    const createdPhoneNumber = await prisma.twilioPhoneNumber.create({
      data: {
        phoneNumber,
        twilioSid: twilioResponse.sid,
        country: 'US', // Default to US or extract from response if available
        monthlyPrice,
        renewalDate,
        userId: user.id,
        chatbotId: chatbotId || null,
        status: 'active',
      },
    });

    // If chatbotId provided, update the chatbot with the phone number
    if (chatbotId) {
      await prisma.chatbot.update({
        where: { id: chatbotId },
        data: { phoneNumber },
      });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Phone number purchased successfully',
      phoneNumber: {
        id: createdPhoneNumber.id,
        number: createdPhoneNumber.phoneNumber,
        twilioSid: createdPhoneNumber.twilioSid,
        country: createdPhoneNumber.country,
        monthlyPrice: `$${createdPhoneNumber.monthlyPrice}`,
        status: createdPhoneNumber.status,
        purchasedAt: formatDate(createdPhoneNumber.purchasedAt),
        renewalDate: formatDate(createdPhoneNumber.renewalDate),
        chatbotId: createdPhoneNumber.chatbotId,
      },
    });
  } catch (error) {
    console.error('Error purchasing phone number:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to purchase phone number' },
      { status: 500 }
    );
  }
} 