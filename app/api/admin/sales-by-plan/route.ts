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

    // Fetch Stripe invoices in the date range (remove status filter to match transactions API)
    let stripeInvoices: any = { data: [] };
    
    if (stripe) {
      try {
        stripeInvoices = await stripe.invoices.list({
          limit: 100,
          created: {
            gte: Math.floor(startDate.getTime() / 1000),
            lte: Math.floor(now.getTime() / 1000),
          },
          expand: ['data.subscription', 'data.subscription.items.data.price'],
        });
      } catch (stripeError: any) {
        console.error('Stripe API error:', stripeError);
        // Continue with empty data if Stripe fails
      }
    } else {
      console.log('Stripe not initialized - using mock data');
    }

    // Initialize plan data
    const planData = {
      starter: { revenue: 0, count: 0 },
      growth: { revenue: 0, count: 0 },
      scale: { revenue: 0, count: 0 },
      custom: { revenue: 0, count: 0 },
    };

    let totalRevenue = 0;

    // Process Stripe invoices (only count paid invoices for revenue)
    for (const invoice of stripeInvoices.data) {
      // Only count paid invoices for revenue calculation
      if (invoice.status !== 'paid') {
        continue;
      }
      
      const amount = invoice.total / 100; // Convert from cents
      totalRevenue += amount;

      if (invoice.subscription && typeof invoice.subscription === 'object') {
        const subscription = invoice.subscription;
        const items = subscription.items?.data || [];
        
        // Determine plan based on price metadata or amount
        let planType = 'custom';
        
        for (const item of items) {
          const price = item.price;
          const unitAmount = price.unit_amount || 0;
          
          // First check price metadata for explicit plan type
          if (price.metadata?.plan_type) {
            planType = price.metadata.plan_type.toLowerCase();
            break;
          }
          
          // Check price nickname for plan indicators
          if (price.nickname) {
            const nickname = price.nickname.toLowerCase();
            if (nickname.includes('starter') || nickname.includes('basic')) {
              planType = 'starter';
            } else if (nickname.includes('growth') || nickname.includes('pro')) {
              planType = 'growth';
            } else if (nickname.includes('scale') || nickname.includes('premium')) {
              planType = 'scale';
            }
            if (planType !== 'custom') break;
          }
          
          // Fallback to price amount categorization
          if (unitAmount <= 2999) { // $29.99 or less
            planType = 'starter';
          } else if (unitAmount <= 9999) { // $99.99 or less
            planType = 'growth';
          } else if (unitAmount <= 29999) { // $299.99 or less
            planType = 'scale';
          } else {
            planType = 'custom';
          }
          
          break; // Use first item for categorization
        }

        if (planData[planType as keyof typeof planData]) {
          planData[planType as keyof typeof planData].revenue += amount;
          planData[planType as keyof typeof planData].count += 1;
        }
      }
    }

    // Fetch local invoices (phone numbers, etc.) in the date range
    const localInvoices = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
        status: 'paid', // Keep paid filter for local invoices as they have clear status
      },
    });

    // Add local invoices to custom category
    for (const invoice of localInvoices) {
      const amount = parseFloat(invoice.amount.toString());
      totalRevenue += amount;
      planData.custom.revenue += amount;
      planData.custom.count += 1;
    }

    // If Stripe is not configured, return empty data
    if (!stripe) {
      return NextResponse.json({
        success: true,
        totalRevenue: 0,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString(),
        },
        planBreakdown: [
          { plan: 'Starter', revenue: 0, count: 0, percentage: 0 },
          { plan: 'Growth', revenue: 0, count: 0, percentage: 0 },
          { plan: 'Scale', revenue: 0, count: 0, percentage: 0 },
          { plan: 'Custom', revenue: 0, count: 0, percentage: 0 },
        ],
        message: 'Stripe not configured',
      });
    }

    // Calculate percentages
    const planSummary = Object.entries(planData).map(([plan, data]) => ({
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      revenue: data.revenue,
      count: data.count,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }));

    return NextResponse.json({
      success: true,
      totalRevenue,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      planBreakdown: planSummary,
    });
  } catch (error: any) {
    console.error('Error fetching sales by plan:', {
      error: error.message,
      stack: error.stack,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    });
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch sales data' },
      { status: 500 }
    );
  }
} 