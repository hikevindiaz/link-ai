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

    // Get last 3 months data
    const now = new Date();
    const monthlyData = [];
    
    // Generate data for last 3 months (current month, previous month, month before)
    for (let i = 2; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      // If it's current month, use current date as end
      const endDate = i === 0 ? now : monthEnd;
      
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
      
      // Get total users at end of this month
      const usersCount = await prisma.user.count({
        where: {
          createdAt: {
            lte: endDate,
          },
        },
      });

      // Get total agents at end of this month
      const agentsCount = await prisma.chatbot.count({
        where: {
          createdAt: {
            lte: endDate,
          },
        },
      });

      // Get active subscriptions (simplified for now)
      let activeSubscriptions = 0;
      if (stripe) {
        try {
          const subscriptions = await stripe.subscriptions.list({
            status: 'active',
            limit: 100,
          });
          activeSubscriptions = subscriptions.data.length;
        } catch (error) {
          console.error('Error fetching Stripe subscriptions:', error);
        }
      }

      monthlyData.push({
        date: monthName,
        Users: usersCount,
        Agents: agentsCount,
        'Active Subscriptions': activeSubscriptions,
      });
    }

    // Calculate current totals and growth rates
    const currentUsers = await prisma.user.count();
    const currentAgents = await prisma.chatbot.count();
    
    // Get previous month total (last month's end total)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevMonthUsers = await prisma.user.count({
      where: {
        createdAt: {
          lte: prevMonthEnd,
        },
      },
    });

    const prevMonthAgents = await prisma.chatbot.count({
      where: {
        createdAt: {
          lte: prevMonthEnd,
        },
      },
    });

    // Get this month's new users/agents (current month growth)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthNewUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: thisMonthStart,
          lte: now,
        },
      },
    });

    const thisMonthNewAgents = await prisma.chatbot.count({
      where: {
        createdAt: {
          gte: thisMonthStart,
          lte: now,
        },
      },
    });

    // Get current active subscriptions
    let currentActiveSubscriptions = 0;
    
    if (stripe) {
      try {
        const activeSubsResponse = await stripe.subscriptions.list({
          status: 'active',
          limit: 100,
        });
        currentActiveSubscriptions = activeSubsResponse.data.length;
      } catch (error) {
        console.error('Error fetching current subscriptions:', error);
      }
    }

    // Calculate actual subscription growth from monthly data
    const currentMonthSubs = monthlyData[monthlyData.length - 1]?.['Active Subscriptions'] || 0;
    const prevMonthSubs = monthlyData[monthlyData.length - 2]?.['Active Subscriptions'] || 0;
    const thisMonthNewSubscriptions = Math.max(0, currentMonthSubs - prevMonthSubs);

    // Calculate growth percentage: (This Month's New / Last Month's Total) * 100
    const calculateGrowthRate = (thisMonthNew: number, lastMonthTotal: number) => {
      if (lastMonthTotal === 0) return thisMonthNew > 0 ? '+100%' : '+0.0%';
      const growthRate = (thisMonthNew / lastMonthTotal) * 100;
      return `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`;
    };

    const summary = [
      {
        name: 'Users',
        description: 'Total registered users',
        category: 'Users',
        current: currentUsers,
        change: calculateGrowthRate(thisMonthNewUsers, prevMonthUsers),
        changeType: thisMonthNewUsers > 0 ? 'positive' : 'neutral',
      },
      {
        name: 'Agents',
        description: 'Total agents created',
        category: 'Agents',
        current: currentAgents,
        change: calculateGrowthRate(thisMonthNewAgents, prevMonthAgents),
        changeType: thisMonthNewAgents > 0 ? 'positive' : 'neutral',
      },
      {
        name: 'Active Subscriptions',
        description: 'Currently active subscriptions',
        category: 'Active Subscriptions',
        current: currentActiveSubscriptions,
        change: calculateGrowthRate(thisMonthNewSubscriptions, prevMonthSubs || 1),
        changeType: thisMonthNewSubscriptions > 0 ? 'positive' : 'neutral',
      },
    ];

    return NextResponse.json({
      success: true,
      data: monthlyData,
      summary,
      period: 'last-3-months',
      dateRange: {
        start: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching manage analytics:', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
} 