import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const adminCheck = await requireAdminAPI();
    if (adminCheck) return adminCheck;

    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get total users count
    const totalUsers = await prisma.user.count();
    
    // Get users from last month for comparison
    const lastMonthUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Get users from this month
    const thisMonthUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Calculate user growth percentage
    const userGrowth = lastMonthUsers > 0 
      ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1)
      : '0.0';

    // Get active users (users with sessions or messages in last 7 days)
    const activeUsers = await prisma.user.count({
      where: {
        OR: [
          {
            sessions: {
              some: {
                expires: {
                  gte: sevenDaysAgo,
                },
              },
            },
          },
          {
            messages: {
              some: {
                createdAt: {
                  gte: sevenDaysAgo,
                },
              },
            },
          },
        ],
      },
    });

    // Get total chatbots (agents)
    const totalChatbots = await prisma.chatbot.count();
    
    // Get chatbots from last month
    const lastMonthChatbots = await prisma.chatbot.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Get chatbots from this month
    const thisMonthChatbots = await prisma.chatbot.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Calculate chatbot growth percentage
    const chatbotGrowth = lastMonthChatbots > 0 
      ? ((thisMonthChatbots - lastMonthChatbots) / lastMonthChatbots * 100).toFixed(1)
      : '0.0';

    // Get total conversations (distinct thread IDs from messages)
    const totalConversations = await prisma.message.findMany({
      select: {
        threadId: true,
      },
      distinct: ['threadId'],
      where: {
        threadId: {
          not: '',
        },
      },
    });

    // Get conversations from this month
    const thisMonthConversations = await prisma.message.findMany({
      select: {
        threadId: true,
      },
      distinct: ['threadId'],
      where: {
        threadId: {
          not: '',
        },
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Get conversations from last month
    const lastMonthConversations = await prisma.message.findMany({
      select: {
        threadId: true,
      },
      distinct: ['threadId'],
      where: {
        threadId: {
          not: '',
        },
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Calculate conversation growth
    const conversationGrowth = lastMonthConversations.length > 0 
      ? ((thisMonthConversations.length - lastMonthConversations.length) / lastMonthConversations.length * 100).toFixed(1)
      : '0.0';

    // Get monthly revenue from subscription items and invoices
    const monthlyRevenue = await prisma.invoice.aggregate({
      where: {
        status: 'paid',
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get last month revenue for comparison
    const lastMonthRevenue = await prisma.invoice.aggregate({
      where: {
        status: 'paid',
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate revenue growth
    const currentRevenue = Number(monthlyRevenue._sum.amount || 0);
    const previousRevenue = Number(lastMonthRevenue._sum.amount || 0);
    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : '0.0';

    // Format revenue
    const formatRevenue = (amount: number) => {
      if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}K`;
      }
      return `$${amount.toFixed(0)}`;
    };

    // Get total API calls from usage records
    const totalApiCalls = await prisma.usageRecord.aggregate({
      where: {
        usageType: {
          in: ['message', 'sms', 'web_search', 'conversation_summary', 'whatsapp_conversation'],
        },
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    // Get last month API calls
    const lastMonthApiCalls = await prisma.usageRecord.aggregate({
      where: {
        usageType: {
          in: ['message', 'sms', 'web_search', 'conversation_summary', 'whatsapp_conversation'],
        },
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    // Calculate API calls growth
    const currentApiCalls = Number(totalApiCalls._sum.quantity || 0);
    const previousApiCalls = Number(lastMonthApiCalls._sum.quantity || 0);
    const apiCallsGrowth = previousApiCalls > 0 
      ? ((currentApiCalls - previousApiCalls) / previousApiCalls * 100).toFixed(1)
      : '0.0';

    // Get total knowledge sources
    const totalKnowledgeSources = await prisma.knowledgeSource.count();
    
    // Get knowledge sources from last month
    const lastMonthKnowledgeSources = await prisma.knowledgeSource.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Get knowledge sources from this month
    const thisMonthKnowledgeSources = await prisma.knowledgeSource.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Calculate knowledge sources growth percentage
    const knowledgeSourcesGrowth = lastMonthKnowledgeSources > 0 
      ? ((thisMonthKnowledgeSources - lastMonthKnowledgeSources) / lastMonthKnowledgeSources * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      totalUsers: {
        value: totalUsers.toLocaleString(),
        change: `${parseFloat(userGrowth) >= 0 ? '+' : ''}${userGrowth}%`,
        changeType: parseFloat(userGrowth) >= 0 ? 'positive' : 'negative',
      },
      totalChatbots: {
        value: totalChatbots.toLocaleString(),
        change: `${parseFloat(chatbotGrowth) >= 0 ? '+' : ''}${chatbotGrowth}%`,
        changeType: parseFloat(chatbotGrowth) >= 0 ? 'positive' : 'negative',
      },
      monthlyRevenue: {
        value: formatRevenue(currentRevenue),
        change: `${parseFloat(revenueGrowth) >= 0 ? '+' : ''}${revenueGrowth}%`,
        changeType: parseFloat(revenueGrowth) >= 0 ? 'positive' : 'negative',
      },
      totalKnowledgeSources: {
        value: totalKnowledgeSources.toLocaleString(),
        change: `${parseFloat(knowledgeSourcesGrowth) >= 0 ? '+' : ''}${knowledgeSourcesGrowth}%`,
        changeType: parseFloat(knowledgeSourcesGrowth) >= 0 ? 'positive' : 'negative',
      },
    });

  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
} 