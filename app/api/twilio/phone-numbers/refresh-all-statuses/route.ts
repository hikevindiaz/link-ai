import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// This endpoint forces a refresh of all phone number statuses for a user
// It's particularly useful when phone numbers are incorrectly showing as suspended
export async function POST(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get user with payment methods
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        paymentMethods: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a valid payment method
    const hasValidPaymentMethod = 
      user.paymentMethods.length > 0 || 
      ['active', 'trialing', 'beta_active'].includes(user.stripeSubscriptionStatus || '') ||
      Boolean(user.stripeCustomerId);
    
    // Get all phone numbers for the user
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      where: { userId },
    });
    
    // Update status for all phone numbers
    const updatedPhoneNumbers = [];
    for (const phone of phoneNumbers) {
      let newStatus = phone.status;
      
      // If the phone is suspended but there's a valid payment method, activate it
      if (phone.status === 'suspended' && hasValidPaymentMethod) {
        newStatus = 'active';
      }
      // If the phone is active but there's no valid payment method, suspend it
      else if (phone.status === 'active' && !hasValidPaymentMethod) {
        newStatus = 'suspended';
      }
      
      // Only update if the status changed
      if (newStatus !== phone.status) {
        const updatedPhone = await prisma.twilioPhoneNumber.update({
          where: { id: phone.id },
          data: { status: newStatus },
        });
        updatedPhoneNumbers.push(updatedPhone);
      }
    }
    
    return NextResponse.json({
      success: true, 
      message: `Updated ${updatedPhoneNumbers.length} phone number(s)`,
      updatedPhoneNumbers: updatedPhoneNumbers.map(p => p.phoneNumber)
    });
  } catch (error) {
    console.error('Error refreshing phone number statuses:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to refresh phone number statuses' },
      { status: 500 }
    );
  }
} 