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
    
    // Extract the account details from the request body
    const {
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country
    } = body;
    
    // Update the user's account details in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
      },
    });
    
    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 