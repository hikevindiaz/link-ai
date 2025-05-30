import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import Stripe from 'stripe';
import { PaymentMethod } from '@prisma/client';

// Stripe client might still be needed if you plan to add links to Stripe portal, etc.
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
//   apiVersion: '2023-10-16',
// });

export async function GET() {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and their payment methods directly from the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        paymentMethods: { // Fetch related payment methods
          orderBy: { isDefault: 'desc' } // Optional: order by default status
        } 
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Use the payment methods directly from the user object fetched from the DB
    const dbPaymentMethods = user.paymentMethods || [];

    // Transform payment methods from DB format to the expected frontend format
    const formattedPaymentMethods = dbPaymentMethods.map((pm: PaymentMethod) => ({
      id: pm.stripePaymentMethodId, // Use the stripe ID as the primary ID for frontend
      isDefault: pm.isDefault,
      card: {
        brand: pm.brand,
        last4: pm.last4,
        exp_month: pm.expMonth,
        exp_year: pm.expYear,
      },
    }));

    console.log(`[GET /billing/payment-methods] User: ${user.id}, Returning ${formattedPaymentMethods.length} methods from DB.`);

    return NextResponse.json({
      success: true,
      paymentMethods: formattedPaymentMethods,
    });
    
  } catch (error: any) {
    console.error('Error fetching payment methods from DB:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
} 