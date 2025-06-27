import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock add-ons data for now - replace with actual Stripe integration
    const addOns = [
      {
        id: 'addon_slack_integration',
        name: 'Slack Integration',
        description: 'Connect your agents to Slack workspaces for seamless team communication',
        price: 1500, // $15.00
        currency: 'usd',
        category: 'integrations',
        active: true,
        createdAt: '2024-01-15T00:00:00Z',
        metadata: {
          integration: 'slack',
          features: ['Real-time messaging', 'Channel management', 'User sync'],
        },
        subscriptionCount: 24,
      },
      {
        id: 'addon_advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Detailed insights and custom reports for your AI agents',
        price: 2500, // $25.00
        currency: 'usd',
        category: 'analytics',
        active: true,
        createdAt: '2024-01-10T00:00:00Z',
        metadata: {
          features: ['Custom dashboards', 'Export reports', 'Real-time metrics'],
        },
        subscriptionCount: 18,
      },
      {
        id: 'addon_custom_training',
        name: 'Custom AI Training',
        description: 'Train custom AI models on your specific data and use cases',
        price: 5000, // $50.00
        currency: 'usd',
        category: 'ai',
        active: true,
        createdAt: '2024-01-05T00:00:00Z',
        metadata: {
          features: ['Custom model training', 'Data pipeline', 'Model versioning'],
        },
        subscriptionCount: 8,
      },
      {
        id: 'addon_priority_support',
        name: 'Priority Support',
        description: '24/7 priority support with dedicated account manager',
        price: 10000, // $100.00
        currency: 'usd',
        category: 'support',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        metadata: {
          features: ['24/7 support', 'Dedicated manager', 'Priority queue'],
        },
        subscriptionCount: 12,
      },
    ];

    return NextResponse.json({ addOns });
  } catch (error) {
    console.error('Error fetching add-ons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, currency, category, active, metadata } = body;

    if (!name || !description || typeof price !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Mock creation - replace with actual Stripe product creation
    const newAddOn = {
      id: `addon_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      name,
      description,
      price,
      currency: currency || 'usd',
      category: category || 'integrations',
      active: active !== false,
      createdAt: new Date().toISOString(),
      metadata: metadata || {},
      subscriptionCount: 0,
    };

    // Here you would create the product in Stripe:
    // const stripeProduct = await stripe.products.create({
    //   name,
    //   description,
    //   metadata: {
    //     category,
    //     ...metadata
    //   }
    // });
    //
    // const stripePrice = await stripe.prices.create({
    //   product: stripeProduct.id,
    //   unit_amount: price,
    //   currency,
    //   recurring: { interval: 'month' }
    // });

    return NextResponse.json({ addOn: newAddOn }, { status: 201 });
  } catch (error) {
    console.error('Error creating add-on:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 