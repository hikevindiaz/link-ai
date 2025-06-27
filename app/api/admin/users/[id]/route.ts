import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminCheck = await requireAdminAPI();
  if (adminCheck) return adminCheck;

  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      name,
      role,
      onboardingCompleted,
      inquiryEmailEnabled,
      marketingEmailEnabled,
      companyName,
      companySize,
      businessWebsite,
      industryType,
      country,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
    } = body;

    // Validate role if provided
    if (role && !['USER', 'ADMIN', 'MODERATOR'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(onboardingCompleted !== undefined && { onboardingCompleted }),
        ...(inquiryEmailEnabled !== undefined && { inquiryEmailEnabled }),
        ...(marketingEmailEnabled !== undefined && { marketingEmailEnabled }),
        ...(companyName !== undefined && { companyName }),
        ...(companySize !== undefined && { companySize }),
        ...(businessWebsite !== undefined && { businessWebsite }),
        ...(industryType !== undefined && { industryType }),
        ...(country !== undefined && { country }),
        ...(addressLine1 !== undefined && { addressLine1 }),
        ...(addressLine2 !== undefined && { addressLine2 }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(postalCode !== undefined && { postalCode }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        onboardingCompleted: true,
        stripeSubscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
        stripePriceId: true,
        inquiryEmailEnabled: true,
        marketingEmailEnabled: true,
        companyName: true,
        companySize: true,
        businessWebsite: true,
        industryType: true,
        country: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// GET single user details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminCheck = await requireAdminAPI();
  if (adminCheck) return adminCheck;

  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        onboardingCompleted: true,
        stripeSubscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
        stripePriceId: true,
        inquiryEmailEnabled: true,
        marketingEmailEnabled: true,
        companyName: true,
        companySize: true,
        businessWebsite: true,
        industryType: true,
        country: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
} 