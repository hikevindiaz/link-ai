import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { inquiryEmailEnabled, marketingEmailEnabled } = body;

    // Update user preferences
    await prisma.user.update({
      where: { email: session.user.email as string },
      data: {
        inquiryEmailEnabled: typeof inquiryEmailEnabled === 'boolean' ? inquiryEmailEnabled : undefined,
        marketingEmailEnabled: typeof marketingEmailEnabled === 'boolean' ? marketingEmailEnabled : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
} 