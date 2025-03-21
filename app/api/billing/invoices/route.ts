import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    let localInvoices: any[] = [];
    try {
      // Fetch invoices from our database
      localInvoices = await prisma.invoice.findMany({
        where: { userId: user.id },
        include: {
          twilioPhoneNumber: {
            select: {
              phoneNumber: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error("Error fetching local invoices:", error);
      // If there's an error (e.g., table doesn't exist yet), continue with empty array
    }

    // If the user has a Stripe customer ID, also fetch invoices from Stripe
    let stripeInvoices: any[] = [];
    if (user.stripeCustomerId) {
      const stripeInvoicesList = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 10, // Limit to 10 most recent invoices
      });
      
      stripeInvoices = stripeInvoicesList.data.map(invoice => ({
        id: invoice.id,
        amount: invoice.total / 100, // Convert from cents to dollars
        status: invoice.status,
        description: invoice.description || 'Subscription Invoice',
        type: 'subscription',
        createdAt: new Date(invoice.created * 1000),
        pdfUrl: invoice.invoice_pdf,
        isStripeInvoice: true
      }));
    }
    
    // Format invoices for the frontend
    const formattedInvoices = localInvoices.map(invoice => ({
      id: invoice.id,
      amount: parseFloat(invoice.amount.toString()),
      status: invoice.status,
      description: invoice.description,
      type: invoice.type,
      createdAt: invoice.createdAt.toISOString(),
      phoneNumber: invoice.twilioPhoneNumber?.phoneNumber || null,
      pdfUrl: invoice.pdfUrl,
      isStripeInvoice: false
    }));
    
    // Combine both sources of invoices and sort by date
    const allInvoices = [...formattedInvoices, ...stripeInvoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      invoices: allInvoices,
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
} 