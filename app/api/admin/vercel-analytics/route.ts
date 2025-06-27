import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const period = searchParams.get('period') || '30d';

    try {
      // Generate simulated analytics data (Vercel doesn't provide public API for analytics)
      const analyticsData = await fetchVercelAnalytics({
        token: 'simulated', // Not used
        teamId: null,
        projectId: null,
        period,
      });

      return NextResponse.json({
        success: true,
        data: analyticsData,
        mockData: true,
        message: 'Simulated data - Vercel does not provide public analytics API',
      });
    } catch (error: any) {
      console.error('Error generating analytics data:', error);
      
      // Return empty data if generation fails
      return NextResponse.json({
        success: true,
        message: 'Using empty data due to generation error',
        mockData: true,
        data: generateEmptyData(period),
      });
    }
  } catch (error: any) {
    console.error('Error fetching Vercel analytics:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

async function fetchVercelAnalytics({
  token,
  teamId,
  projectId,
  period,
}: {
  token: string;
  teamId?: string | null;
  projectId?: string | null;
  period: string;
}) {
  // NOTE: Vercel does not provide a public API for Web Analytics data
  // This is a simulation based on realistic analytics patterns
  console.log('Generating simulated Vercel Analytics data - no public API available');
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  // Generate realistic analytics data
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const chartData = [];
  let totalPageViews = 0;
  let totalUniqueVisitors = 0;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
    });
    
    // Generate realistic traffic patterns
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Base traffic with some randomness
    const basePageViews = isWeekend ? 15 : 25;
    const baseVisitors = isWeekend ? 8 : 15;
    
    // Add some variation (±30%)
    const pageViews = Math.floor(basePageViews + (Math.random() - 0.5) * basePageViews * 0.6);
    const uniqueVisitors = Math.floor(baseVisitors + (Math.random() - 0.5) * baseVisitors * 0.6);
    
    totalPageViews += pageViews;
    totalUniqueVisitors += uniqueVisitors;
    
    chartData.push({
      date: formattedDate,
      'Page views': pageViews,
      'Unique visitors': uniqueVisitors,
    });
  }

  // Simulate top pages data
  const topPages = [
    { path: '/', views: Math.floor(totalPageViews * 0.3) },
    { path: '/dashboard', views: Math.floor(totalPageViews * 0.25) },
    { path: '/login', views: Math.floor(totalPageViews * 0.15) },
    { path: '/chat', views: Math.floor(totalPageViews * 0.12) },
    { path: '/agents', views: Math.floor(totalPageViews * 0.08) },
    { path: '/settings', views: Math.floor(totalPageViews * 0.05) },
    { path: '/docs', views: Math.floor(totalPageViews * 0.03) },
    { path: '/pricing', views: Math.floor(totalPageViews * 0.02) },
  ];
  
  return {
    chartData,
    summary: {
      pageViews: totalPageViews,
      uniqueVisitors: totalUniqueVisitors,
    },
    topPages,
    period,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
}



function generateEmptyData(period: string) {
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const data = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
    });
    
    data.push({
      date: formattedDate,
      'Page views': 0,
      'Unique visitors': 0,
    });
  }
  
  return {
    chartData: data,
    summary: {
      pageViews: 0,
      uniqueVisitors: 0,
    },
    topPages: [],
    period,
    dateRange: {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
  };
} 