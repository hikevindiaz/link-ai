import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

// GET /api/user/business-info - Get user's business information
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyName: true,
        businessWebsite: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        industryType: true,
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      businessInfo: user
    });
  } catch (error) {
    console.error('Error fetching business info:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch business information' 
    }, { status: 500 });
  }
}

// POST /api/user/business-info - Update user's business information
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyName,
      businessWebsite,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      industryType
    } = body;

    // Validate required fields
    if (!companyName || !addressLine1 || !city || !state || !postalCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Update user's business information
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        companyName,
        businessWebsite: businessWebsite || null,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        postalCode,
        country: country || 'US',
        industryType: industryType || 'other',
      },
      select: {
        companyName: true,
        businessWebsite: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        industryType: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Business information updated successfully',
      businessInfo: updatedUser
    });
  } catch (error) {
    console.error('Error updating business info:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update business information' 
    }, { status: 500 });
  }
} 