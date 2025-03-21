import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const body = await req.json();
    
    // Extract the business details from the request body
    const {
      companyName,
      businessWebsite,
      companySize,
      industryType
    } = body;
    
    // Update the user's business details in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        companyName,
        businessWebsite,
        companySize,
        industryType
      },
    });
    
    return NextResponse.json({ success: true, message: 'Business information updated successfully' });
  } catch (error) {
    console.error('Error updating business information:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update business information' },
      { status: 500 }
    );
  }
} 