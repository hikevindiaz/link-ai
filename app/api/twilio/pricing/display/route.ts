import { NextRequest, NextResponse } from 'next/server';
import { getPhoneNumberDisplayPricing } from '@/lib/stripe-phone-pricing';

// GET /api/twilio/pricing/display - Get phone number pricing with markup for display
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country') || 'US';
    
    console.log(`[Pricing Display] Getting pricing for country: ${country}`);
    
    const pricing = await getPhoneNumberDisplayPricing(country);
    
    console.log(`[Pricing Display] Result for ${country}:`, pricing);
    
    return NextResponse.json({
      success: true,
      ...pricing
    });
  } catch (error) {
    console.error('Error getting display pricing:', error);
    
    // Return fallback pricing
    return NextResponse.json({
      success: false,
      country: 'US',
      monthlyPrice: 6.75,
      formattedPrice: '$6.75',
      breakdown: {
        twilioPrice: 3.75,
        markup: 3.00,
        total: 6.75
      },
      currency: 'usd',
      error: 'Failed to get dynamic pricing, using fallback'
    });
  }
} 