import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Fetch the user's profile from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        companyName: true,
        businessWebsite: true,
        companySize: true,
        industryType: true,
        businessTasks: true,
        communicationChannels: true,
      },
    });
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    
    // Transform the data to match our profile structure
    const profile = {
      fullName: user.name,
      email: user.email,
      addressLine1: user.addressLine1 || '',
      addressLine2: user.addressLine2 || '',
      city: user.city || '',
      state: user.state || '',
      postalCode: user.postalCode || '',
      country: user.country || '',
      companyName: user.companyName || '',
      businessWebsite: user.businessWebsite || '',
      companySize: user.companySize || '',
      industryType: user.industryType || '',
      businessTasks: user.businessTasks || [],
      communicationChannels: user.communicationChannels || [],
    };
    
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
} 