import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Mock data - replace with actual Stripe API call
    const addOn = {
      id,
      name: 'Sample Add-on',
      description: 'Sample description',
      price: 1500,
      currency: 'usd',
      category: 'integrations',
      active: true,
      createdAt: new Date().toISOString(),
      metadata: {},
    };

    return NextResponse.json({ addOn });
  } catch (error) {
    console.error('Error fetching add-on:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Mock update - replace with actual Stripe API call
    const updatedAddOn = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ addOn: updatedAddOn });
  } catch (error) {
    console.error('Error updating add-on:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Mock deletion - replace with actual Stripe API call
    // await stripe.products.update(id, { active: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting add-on:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 