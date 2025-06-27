import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdminAPI();
  if (adminCheck) return adminCheck;

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
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
        role: true,
        status: true,
        blockedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const adminCheck = await requireAdminAPI();
  if (adminCheck) return adminCheck;

  try {
    const { userId, role } = await req.json();
    
    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }
    
    if (!['USER', 'ADMIN', 'MODERATOR'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
} 