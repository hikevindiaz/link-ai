import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { starterPlan, growthPlan, scalePlan, freePlan } from '@/config/subscriptions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const customer = searchParams.get('customer');

    // Get users with active subscriptions from database
    const usersWithSubscriptions = await prisma.user.findMany({
      where: {
        AND: [
          {
            stripeSubscriptionId: {
              not: null
            }
          },
          status !== 'all' ? {
            stripeSubscriptionStatus: status
          } : {},
          customer ? {
            OR: [
              {
                name: {
                  contains: customer,
                  mode: 'insensitive'
                }
              },
              {
                email: {
                  contains: customer,
                  mode: 'insensitive'
                }
              }
            ]
          } : {}
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
        stripePriceId: true,
        stripeCustomerId: true,
        createdAt: true,
        subscriptionItems: {
          where: {
            isActive: true
          },
          include: {
            phoneNumbers: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch Stripe subscription details and usage data
    const subscriptions = await Promise.all(
      usersWithSubscriptions.map(async (user) => {
        try {
          // Get Stripe subscription details
          let stripeSubscription = null;
          let stripePlan = null;
          
          if (user.stripeSubscriptionId) {
            stripeSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            
            // Get plan details from Stripe
            if (user.stripePriceId) {
              stripePlan = await stripe.prices.retrieve(user.stripePriceId, {
                expand: ['product']
              });
            }
          }

          // Calculate current billing period
          const now = new Date();
          const periodStart = stripeSubscription?.current_period_start 
            ? new Date(stripeSubscription.current_period_start * 1000)
            : new Date(now.getFullYear(), now.getMonth(), 1);
          const periodEnd = stripeSubscription?.current_period_end
            ? new Date(stripeSubscription.current_period_end * 1000)
            : new Date(now.getFullYear(), now.getMonth() + 1, 0);

          // Get usage data from database for current billing period
          const usageRecords = await prisma.usageRecord.findMany({
            where: {
              userId: user.id,
              billingPeriodStart: {
                gte: periodStart
              },
              billingPeriodEnd: {
                lte: periodEnd
              }
            }
          });

          // Aggregate usage by type
          const usageByType = usageRecords.reduce((acc, record) => {
            if (!acc[record.usageType]) {
              acc[record.usageType] = 0;
            }
            acc[record.usageType] += record.quantity;
            return acc;
          }, {} as Record<string, number>);

          // Get plan limits based on price ID
          const getPlanLimits = (priceId: string | null | undefined) => {
            if (priceId === starterPlan.stripePriceId) {
              return {
                messages: starterPlan.maxMessagesPerMonth || 0,
                sms: starterPlan.maxSMSPerMonth || 0,
                webSearches: starterPlan.maxWebSearchesPerMonth || 0,
                voiceMinutes: starterPlan.maxVoiceMinutesPerMonth || 0,
                storage: 5, // Default storage for starter
              };
            } else if (priceId === growthPlan.stripePriceId) {
              return {
                messages: growthPlan.maxMessagesPerMonth || 0,
                sms: growthPlan.maxSMSPerMonth || 0,
                webSearches: growthPlan.maxWebSearchesPerMonth || 0,
                voiceMinutes: growthPlan.maxVoiceMinutesPerMonth || 0,
                storage: 25, // Default storage for growth
              };
            } else if (priceId === scalePlan.stripePriceId) {
              return {
                messages: scalePlan.maxMessagesPerMonth || 0,
                sms: scalePlan.maxSMSPerMonth || 0,
                webSearches: scalePlan.maxWebSearchesPerMonth || 0,
                voiceMinutes: scalePlan.maxVoiceMinutesPerMonth || 0,
                storage: 100, // Default storage for scale
              };
            }
            
            // Free plan defaults
            return {
              messages: freePlan.maxMessagesPerMonth || 500,
              sms: 0,
              webSearches: 0,
              voiceMinutes: 0,
              storage: 1,
            };
          };

          const planLimits = getPlanLimits(user.stripePriceId);

          // Get plan name based on price ID
          const getPlanName = (priceId: string | null | undefined) => {
            if (priceId === starterPlan.stripePriceId) return starterPlan.name;
            if (priceId === growthPlan.stripePriceId) return growthPlan.name;
            if (priceId === scalePlan.stripePriceId) return scalePlan.name;
            return freePlan.name;
          };

          // Calculate storage usage (simplified - you might want to implement actual file size tracking)
          const fileCount = await prisma.file.count({
            where: { userId: user.id }
          });
          const estimatedStorageGB = Math.round((fileCount * 0.5) * 100) / 100; // Estimate 0.5MB per file

          const usage = {
            messages: { 
              used: usageByType.messages || 0, 
              limit: planLimits.messages 
            },
            sms: { 
              used: usageByType.sms || 0, 
              limit: planLimits.sms 
            },
            webSearches: { 
              used: usageByType.webSearches || 0, 
              limit: planLimits.webSearches 
            },
            voiceMinutes: { 
              used: usageByType.voiceMinutes || 0, 
              limit: planLimits.voiceMinutes 
            },
            storage: { 
              used: estimatedStorageGB, 
              limit: planLimits.storage 
            }
          };

          // Get add-ons from subscription items
          const addOns = user.subscriptionItems
            .filter(item => item.itemType !== 'phone_number')
            .map(item => {
              const metadata = item.metadata as { name?: string } | null;
              return {
                id: item.id,
                name: metadata?.name || 'Add-on',
                price: 1500, // You might want to fetch this from Stripe
              };
            });

          // Calculate total amount
          const planPrice = stripePlan?.unit_amount || 0;
          const addOnPrice = addOns.reduce((sum, addon) => sum + addon.price, 0);
          const totalAmount = planPrice + addOnPrice;

          return {
            id: user.stripeSubscriptionId || `user_${user.id}`,
            userId: user.id,
            user: {
              name: user.name,
              email: user.email || ''
            },
            plan: {
              id: user.stripePriceId || 'free',
              name: getPlanName(user.stripePriceId),
              price: planPrice,
              currency: stripePlan?.currency || 'usd',
              interval: stripePlan?.recurring?.interval || 'month'
            },
            status: user.stripeSubscriptionStatus || 'active',
            currentPeriodStart: periodStart.toISOString(),
            currentPeriodEnd: periodEnd.toISOString(),
            cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
            createdAt: user.createdAt.toISOString(),
            usage,
            addOns,
            totalAmount
          };
        } catch (error) {
          console.error(`Error processing subscription for user ${user.id}:`, error);
          
          // Return basic data if Stripe call fails
          const getPlanNameFallback = (priceId: string | null | undefined) => {
            if (priceId === starterPlan.stripePriceId) return starterPlan.name;
            if (priceId === growthPlan.stripePriceId) return growthPlan.name;
            if (priceId === scalePlan.stripePriceId) return scalePlan.name;
            return freePlan.name;
          };

          return {
            id: `user_${user.id}`,
            userId: user.id,
            user: {
              name: user.name,
              email: user.email || ''
            },
            plan: {
              id: user.stripePriceId || 'free',
              name: getPlanNameFallback(user.stripePriceId),
              price: 0,
              currency: 'usd',
              interval: 'month'
            },
            status: user.stripeSubscriptionStatus || 'unknown',
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date().toISOString(),
            cancelAtPeriodEnd: false,
            createdAt: user.createdAt.toISOString(),
            usage: {
              messages: { used: 0, limit: 1000 },
              sms: { used: 0, limit: 25 },
              webSearches: { used: 0, limit: 50 },
              voiceMinutes: { used: 0, limit: 0 },
              storage: { used: 0, limit: 1 }
            },
            addOns: [],
            totalAmount: 0
          };
        }
      })
    );

    // Filter by status if specified
    let filteredSubscriptions = subscriptions;
    if (status !== 'all') {
      filteredSubscriptions = subscriptions.filter(sub => sub.status === status);
    }

    // Filter by customer if specified
    if (customer) {
      filteredSubscriptions = filteredSubscriptions.filter(sub => 
        sub.user.name.toLowerCase().includes(customer.toLowerCase()) ||
        sub.user.email.toLowerCase().includes(customer.toLowerCase())
      );
    }

    return NextResponse.json({ subscriptions: filteredSubscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 