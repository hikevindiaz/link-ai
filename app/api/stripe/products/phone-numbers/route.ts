import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrCreateStripePhonePrice, getTwilioPricingWithMarkup } from '@/lib/stripe-phone-pricing';

// GET /api/stripe/products/phone-numbers - Get or create phone number pricing
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country') || 'US';
    const phoneNumber = searchParams.get('phoneNumber') || '+1234567890'; // Dummy number for price creation
    
    console.log(`[Stripe Products] Creating/getting price for ${country} phone numbers`);
    
    const { price, pricing } = await getOrCreateStripePhonePrice(phoneNumber, country);
    
    return NextResponse.json({
      success: true,
      stripePrice: {
        id: price.id,
        unitAmount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring
      },
      pricing: {
        country: pricing.country,
        twilioPrice: pricing.twilioPrice,
        markup: pricing.markup,
        totalPrice: pricing.totalPrice
      }
    });
  } catch (error) {
    console.error('Error creating Stripe phone number price:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create/get Stripe price' },
      { status: 500 }
    );
  }
}

// POST /api/stripe/products/phone-numbers - Bulk create prices for common countries
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { countries } = body;
    
    if (!countries || !Array.isArray(countries)) {
      return NextResponse.json({ error: 'Countries array required' }, { status: 400 });
    }
    
    console.log(`[Stripe Products] Bulk creating prices for countries:`, countries);
    
    const results = [];
    
    for (const country of countries) {
      try {
        const { price, pricing } = await getOrCreateStripePhonePrice(`+${Date.now()}`, country);
        results.push({
          country,
          success: true,
          priceId: price.id,
          pricing
        });
      } catch (error) {
        console.error(`Failed to create price for ${country}:`, error);
        results.push({
          country,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error bulk creating Stripe prices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk create prices' },
      { status: 500 }
    );
  }
} 