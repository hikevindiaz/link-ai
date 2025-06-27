import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

// Initialize Stripe
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
} catch (error) {
  console.error('Stripe initialization error:', error);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!user || (user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30D';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7D':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30D':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6M':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case 'week-to-date':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        startDate = startOfWeek;
        break;
      case 'month-to-date':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year-to-date':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch all invoices from our database within the date range
    let localInvoices: any[] = [];
    try {
      localInvoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            }
          },
          twilioPhoneNumber: {
            select: {
              phoneNumber: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to most recent 100
      });
    } catch (error) {
      console.error("Error fetching local invoices:", error);
    }

    // Fetch recent invoices from Stripe within the date range
    let stripeInvoices: any[] = [];
    
    if (stripe) {
      try {
        const stripeInvoicesList = await stripe.invoices.list({
          limit: 100, // Limit to 100 most recent invoices
          created: {
            gte: Math.floor(startDate.getTime() / 1000),
            lte: Math.floor(now.getTime() / 1000),
          },
          expand: ['data.customer'],
        });
        
        stripeInvoices = stripeInvoicesList.data.map(invoice => ({
          id: invoice.id,
          amount: invoice.total / 100, // Convert from cents to dollars
          status: invoice.status,
          description: invoice.description || 'Subscription Invoice',
          type: 'subscription',
          createdAt: new Date(invoice.created * 1000),
          pdfUrl: invoice.invoice_pdf,
          isStripeInvoice: true,
          customer: {
            id: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
            email: typeof invoice.customer === 'string' ? null : (invoice.customer as any)?.email,
            name: typeof invoice.customer === 'string' ? null : (invoice.customer as any)?.name,
          }
        }));
      } catch (error) {
        console.error("Error fetching Stripe invoices:", error);
      }
    } else {
      console.log('Stripe not initialized - skipping Stripe invoices');
      // No mock data - only show real local invoices if any exist
    }

    // Format local invoices for the frontend
    const formattedLocalInvoices = localInvoices.map(invoice => ({
      id: invoice.id,
      amount: parseFloat(invoice.amount.toString()),
      status: invoice.status,
      description: invoice.description,
      type: invoice.type,
      createdAt: invoice.createdAt.toISOString(),
      phoneNumber: invoice.twilioPhoneNumber?.phoneNumber || null,
      pdfUrl: invoice.pdfUrl,
      isStripeInvoice: false,
      customer: {
        id: invoice.user.id,
        email: invoice.user.email,
        name: invoice.user.name,
      }
    }));
    
    // Combine both sources of invoices and sort by date
    const allTransactions = [...formattedLocalInvoices, ...stripeInvoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
    });
  } catch (error: any) {
    console.error('Error fetching admin transactions:', {
      error: error.message,
      stack: error.stack,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    });
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
} 