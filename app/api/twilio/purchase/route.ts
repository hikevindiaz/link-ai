import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// The schema for the purchase request
const purchasePhoneNumberSchema = z.object({
  phoneNumber: z.string(),
  country: z.string(),
  monthlyPrice: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the user's ID from the session
    const userId = session.user.id;
    
    // Parse and validate the request body
    const body = await req.json();
    const validatedData = purchasePhoneNumberSchema.parse(body);
    
    // Check if the user has a valid payment method
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, stripeSubscriptionId: true },
    });
    
    // Require a stripe customer ID (payment method)
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No payment method found',
        code: 'NO_PAYMENT_METHOD'
      }, { status: 400 });
    }
    
    // In a real implementation, this is where you would:
    // 1. Call Twilio API to purchase the number
    // 2. Create a Stripe subscription or add an item to existing subscription
    // 3. Save the phone number record
    
    // For this implementation, we'll just create a record in the database
    const phoneNumber = await prisma.twilioPhoneNumber.create({
      data: {
        userId: userId,
        phoneNumber: validatedData.phoneNumber,
        country: validatedData.country,
        monthlyPrice: validatedData.monthlyPrice,
        status: 'active', // In a real implementation, could be 'pending' until provisioning completes
        renewsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });
    
    return NextResponse.json({
      success: true,
      phoneNumber: {
        id: phoneNumber.id,
        number: phoneNumber.phoneNumber,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    
    console.error('Error purchasing phone number:', error);
    return NextResponse.json({ error: 'Failed to purchase phone number' }, { status: 500 });
  }
} 