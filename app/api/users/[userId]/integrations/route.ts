import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RouteProps {
  params: {
    userId: string;
  };
}

// GET /api/users/[userId]/integrations - Get user integration settings
export async function GET(request: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Ensure the user is fetching their own data
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch integration settings
    const integrationSettings = await prisma.userIntegrationSetting.findMany({
      where: {
        userId,
      },
    });

    // Map to a more friendly format
    const integrations = {
      calendar: integrationSettings.some(
        (setting) => setting.integrationId === 'module-calendar' && setting.isEnabled
      ),
      orders: integrationSettings.some(
        (setting) => setting.integrationId === 'module-orders' && setting.isEnabled
      ),
      leads: integrationSettings.some(
        (setting) => setting.integrationId === 'module-forms' && setting.isEnabled
      ),
      aviationstack: integrationSettings.some(
        (setting) => setting.integrationId === 'ext-aviationstack' && setting.isEnabled
      ),
    };

    return NextResponse.json(integrations);
  } catch (error) {
    console.error('Error fetching integration settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration settings' },
      { status: 500 }
    );
  }
}

// POST /api/users/[userId]/integrations - Update user integration settings
export async function POST(request: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Ensure the user is updating their own data
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get integration settings from the request body
    const body = await request.json();
    const { integrations } = body;

    if (!integrations || typeof integrations !== 'object') {
      return NextResponse.json({ error: 'Integrations object is required' }, { status: 400 });
    }

    // Update each integration setting
    const results = [];

    // Handle calendar integration
    if ('calendar' in integrations) {
      const isEnabled = !!integrations.calendar;
      const result = await upsertIntegrationSetting(userId, 'module-calendar', isEnabled);
      results.push(result);
    }

    // Handle orders integration
    if ('orders' in integrations) {
      const isEnabled = !!integrations.orders;
      const result = await upsertIntegrationSetting(userId, 'module-orders', isEnabled);
      results.push(result);
    }

    // Handle leads/forms integration
    if ('leads' in integrations) {
      const isEnabled = !!integrations.leads;
      const result = await upsertIntegrationSetting(userId, 'module-forms', isEnabled);
      results.push(result);
    }

    // Handle aviationstack integration
    if ('aviationstack' in integrations) {
      const isEnabled = !!integrations.aviationstack;
      const result = await upsertIntegrationSetting(userId, 'ext-aviationstack', isEnabled);
      results.push(result);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error updating integration settings:', error);
    return NextResponse.json(
      { error: 'Failed to update integration settings' },
      { status: 500 }
    );
  }
}

// Helper function to upsert an integration setting
async function upsertIntegrationSetting(
  userId: string,
  integrationId: string,
  isEnabled: boolean
) {
  // Check if the setting already exists
  const existingSetting = await prisma.userIntegrationSetting.findFirst({
    where: {
      userId,
      integrationId,
    },
  });

  if (existingSetting) {
    // Update the existing setting
    return prisma.userIntegrationSetting.update({
      where: {
        id: existingSetting.id,
      },
      data: {
        isEnabled,
        configuredAt: new Date(),
      },
    });
  } else {
    // Create a new setting
    return prisma.userIntegrationSetting.create({
      data: {
        userId,
        integrationId,
        isEnabled,
        configuredAt: new Date(),
      },
    });
  }
} 