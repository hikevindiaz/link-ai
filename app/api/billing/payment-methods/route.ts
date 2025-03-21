import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { PaymentMethod } from '@prisma/client';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export async function GET() {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { paymentMethods: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // If user has no Stripe customer ID, return empty array
    if (!user.stripeCustomerId) {
      return NextResponse.json({
        success: true,
        paymentMethods: [],
      });
    }

    // Fetch payment methods from Stripe
    const stripePaymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    // Get default payment method if available
    let defaultPaymentMethodId: string | null = null;
    if (user.stripeCustomerId) {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (customer && !customer.deleted && 'invoice_settings' in customer) {
        defaultPaymentMethodId = customer.invoice_settings.default_payment_method as string;
      }
    }

    // Sync payment methods with database
    const paymentMethodsToCreate = [];
    const paymentMethodsToUpdate = [];
    const existingPaymentMethodIds = new Set(user.paymentMethods.map((pm: PaymentMethod) => pm.stripePaymentMethodId));

    for (const pm of stripePaymentMethods.data) {
      if (pm.type === 'card' && pm.card) {
        const isDefault = pm.id === defaultPaymentMethodId;
        
        if (existingPaymentMethodIds.has(pm.id)) {
          // Update existing payment method
          paymentMethodsToUpdate.push({
            where: { stripePaymentMethodId: pm.id },
            data: {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
              isDefault,
            },
          });
        } else {
          // Create new payment method
          paymentMethodsToCreate.push({
            stripePaymentMethodId: pm.id,
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
            isDefault,
            userId: user.id,
          });
        }
      }
    }

    // Execute database operations
    await Promise.all([
      // Create new payment methods
      ...paymentMethodsToCreate.map(data => 
        prisma.paymentMethod.create({ data })
      ),
      
      // Update existing payment methods
      ...paymentMethodsToUpdate.map(({ where, data }) => 
        prisma.paymentMethod.update({ where, data })
      ),
      
      // Remove payment methods that no longer exist in Stripe
      prisma.paymentMethod.deleteMany({
        where: {
          userId: user.id,
          stripePaymentMethodId: {
            notIn: stripePaymentMethods.data.map(pm => pm.id),
          },
        },
      }),
    ]);

    // Fetch updated payment methods from database
    const updatedUserWithPaymentMethods = await prisma.user.findUnique({
      where: { id: user.id },
      include: { paymentMethods: true },
    });

    // Transform payment methods to match the expected format in the frontend
    const formattedPaymentMethods = updatedUserWithPaymentMethods?.paymentMethods.map((pm: PaymentMethod) => ({
      id: pm.stripePaymentMethodId,
      isDefault: pm.isDefault,
      card: {
        brand: pm.brand,
        last4: pm.last4,
        exp_month: pm.expMonth,
        exp_year: pm.expYear,
      },
    })) || [];

    return NextResponse.json({
      success: true,
      paymentMethods: formattedPaymentMethods,
    });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
} 