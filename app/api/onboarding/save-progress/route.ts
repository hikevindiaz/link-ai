import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const saveProgressSchema = z.object({
  step: z.enum(['account', 'business']),
  data: z.record(z.any()),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { step, data } = saveProgressSchema.parse(body);

    // Update user data based on the step
    if (step === 'account') {
      // Save account data
      await db.user.update({
        where: { id: session.user.id },
        data: {
          name: data.fullName || data.name,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        },
      });
    } else if (step === 'business') {
      // Save business data
      await db.user.update({
        where: { id: session.user.id },
        data: {
          companyName: data.companyName,
          businessWebsite: data.businessWebsite,
          companySize: data.companySize,
          industryType: data.industryType,
          // Store tasks and channels as JSON in metadata or separate fields
          // For now, we'll just save the main fields
        },
      });
    }

    return NextResponse.json({ 
      success: true,
      message: `${step} data saved successfully`
    });

  } catch (error) {
    console.error('Error saving onboarding progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save progress' },
      { status: 500 }
    );
  }
} 