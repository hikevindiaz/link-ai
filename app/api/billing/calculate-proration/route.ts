import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { newPriceId } = await req.json();

    if (!newPriceId) {
      return NextResponse.json(
        { success: false, message: 'New price ID is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { success: false, message: 'User not found or no Stripe customer' },
        { status: 404 }
      );
    }

    // If user has an existing subscription, calculate proration
    if (user.stripeSubscriptionId) {
      try {
        // Get current subscription
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        // Check if user is currently on trial
        const isOnTrial = subscription.status === 'trialing';
        
        if (isOnTrial) {
          // Handle trial scenario - no proration needed
          const newPrice = await stripe.prices.retrieve(newPriceId);
          const monthlyAmount = newPrice.unit_amount ? newPrice.unit_amount / 100 : 0;
          
          console.log('[Proration] Trial detected:', {
            status: subscription.status,
            trial_end: subscription.trial_end,
            monthlyAmount
          });
          
          return NextResponse.json({
            success: true,
            isChangingPlan: false, // This is a trial, not a plan change
            isTrial: true,
            dueToday: 0, // Free trial
            monthlyAmount,
            trialEndDate: new Date(subscription.trial_end! * 1000).toISOString(),
            firstBillingDate: new Date(subscription.trial_end! * 1000).toISOString(),
            firstBillingAmount: monthlyAmount, // This will be the base plan only
            currency: newPrice.currency,
          });
        }
        
        // Preview the upcoming invoice with the new price
        const previewInvoice = await stripe.invoices.retrieveUpcoming({
          customer: user.stripeCustomerId,
          subscription: user.stripeSubscriptionId,
          subscription_items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          subscription_proration_behavior: 'create_prorations',
        });

        console.log('[Proration] Preview invoice:', {
          amount_due: previewInvoice.amount_due,
          subtotal: previewInvoice.subtotal,
          total: previewInvoice.total,
          lines_count: previewInvoice.lines.data.length
        });

        // Log all line items for debugging
        previewInvoice.lines.data.forEach((line, index) => {
          console.log(`[Proration] Line ${index}:`, {
            description: line.description,
            amount: line.amount,
            proration: line.proration,
            period: {
              start: new Date(line.period.start * 1000).toISOString(),
              end: new Date(line.period.end * 1000).toISOString()
            }
          });
        });

        // Filter out phone number charges - only include base plan charges
        const basePlanLines = previewInvoice.lines.data.filter(line => {
          const description = line.description?.toLowerCase() || '';
          // Exclude phone number related charges
          return !description.includes('phone number') && 
                 !description.includes('phone') &&
                 !description.includes('number');
        });

        console.log('[Proration] Filtered lines (base plan only):', basePlanLines.length);

        // Calculate amounts based only on base plan changes
        const basePlanTotal = basePlanLines.reduce((sum, line) => sum + line.amount, 0);
        const totalDueToday = Math.max(0, basePlanTotal / 100); // Convert from cents and ensure non-negative
        
        // Get detailed proration adjustments (base plan only)
        const prorationAdjustments = basePlanLines.map(line => ({
          description: line.description || 'Plan adjustment',
          amount: line.amount / 100,
          isProration: line.proration || false,
          period: {
            start: new Date(line.period.start * 1000),
            end: new Date(line.period.end * 1000),
          },
        }));

        const nextBillingDate = new Date(subscription.current_period_end * 1000);
        
        // Get new price info
        const newPrice = await stripe.prices.retrieve(newPriceId);
        const monthlyAmount = newPrice.unit_amount ? newPrice.unit_amount / 100 : 0;

        console.log('[Proration] Price info:', {
          monthlyAmount,
          totalDueToday,
          currency: newPrice.currency
        });

        // Validation: Due today shouldn't be significantly higher than monthly amount
        // Allow for reasonable proration but catch obvious errors
        if (totalDueToday > monthlyAmount * 1.5) {
          console.warn('[Proration] Due today seems too high, using fallback calculation');
          
          // Fallback: calculate simple proration based on remaining days in period
          const now = new Date();
          const periodEnd = new Date(subscription.current_period_end * 1000);
          const periodStart = new Date(subscription.current_period_start * 1000);
          const totalDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
          const remainingDays = Math.max(0, (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const proratedAmount = monthlyAmount * (remainingDays / totalDays);
          
          return NextResponse.json({
            success: true,
            isChangingPlan: true,
            dueToday: Math.round(proratedAmount * 100) / 100, // Round to 2 decimal places
            monthlyAmount,
            nextBillingDate: periodEnd.toISOString(),
            prorationAdjustments: [
              {
                description: `Prorated new plan (${Math.round(remainingDays)} days remaining)`,
                amount: proratedAmount
              }
            ],
            currency: newPrice.currency,
            fallback: true
          });
        }

        return NextResponse.json({
          success: true,
          isChangingPlan: true,
          dueToday: totalDueToday,
          monthlyAmount,
          nextBillingDate: nextBillingDate.toISOString(),
          prorationAdjustments,
          currency: newPrice.currency,
        });
      } catch (error) {
        console.error('Error calculating proration:', error);
        // Fallback to simple calculation
        const newPrice = await stripe.prices.retrieve(newPriceId);
        const monthlyAmount = newPrice.unit_amount ? newPrice.unit_amount / 100 : 0;
        
        return NextResponse.json({
          success: true,
          isChangingPlan: true,
          dueToday: monthlyAmount, // Fallback: charge full amount
          monthlyAmount,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          prorationAdjustments: [],
          currency: newPrice.currency,
        });
      }
    } else {
      // New subscription - free trial
      const newPrice = await stripe.prices.retrieve(newPriceId);
      const monthlyAmount = newPrice.unit_amount ? newPrice.unit_amount / 100 : 0;
      
      return NextResponse.json({
        success: true,
        isChangingPlan: false,
        isTrial: true,
        dueToday: 0, // Free trial
        monthlyAmount,
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        firstBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        firstBillingAmount: monthlyAmount,
        currency: newPrice.currency,
      });
    }
  } catch (error) {
    console.error('Error calculating proration:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 