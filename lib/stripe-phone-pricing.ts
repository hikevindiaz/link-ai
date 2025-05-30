import Stripe from 'stripe';
import twilio from 'twilio';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Standardized markup in dollars
const PHONE_NUMBER_MARKUP = 3.00;

interface PhoneNumberPricing {
  twilioPrice: number;
  markup: number;
  totalPrice: number;
  currency: string;
  country: string;
}

/**
 * Get Twilio pricing for a specific country and calculate total with markup
 */
export async function getTwilioPricingWithMarkup(country: string = 'US'): Promise<PhoneNumberPricing> {
  try {
    // Get Twilio pricing for the country
    const pricing = await twilioClient.pricing.v1.phoneNumbers.countries(country).fetch();
    
    // Get local phone number price (most common type)
    const localPrice = pricing.phoneNumberPrices.find(price => 
      price.number_type === 'local' || price.number_type === 'mobile'
    );
    
    if (!localPrice) {
      throw new Error(`No pricing found for country: ${country}`);
    }
    
    const twilioPrice = parseFloat(localPrice.current_price.toString());
    const totalPrice = twilioPrice + PHONE_NUMBER_MARKUP;
    
    return {
      twilioPrice,
      markup: PHONE_NUMBER_MARKUP,
      totalPrice,
      currency: pricing.priceUnit.toLowerCase(),
      country: pricing.country
    };
  } catch (error) {
    console.error('Error fetching Twilio pricing:', error);
    // Fallback to US pricing if specific country fails
    if (country !== 'US') {
      return getTwilioPricingWithMarkup('US');
    }
    
    // Hard fallback
    return {
      twilioPrice: 3.75,
      markup: PHONE_NUMBER_MARKUP,
      totalPrice: 6.75,
      currency: 'usd',
      country: 'US'
    };
  }
}

/**
 * Create or get a Stripe price for a phone number with markup
 */
export async function getOrCreateStripePhonePrice(
  phoneNumber: string,
  country: string = 'US'
): Promise<{ price: Stripe.Price; pricing: PhoneNumberPricing }> {
  try {
    // Get pricing with markup
    const pricing = await getTwilioPricingWithMarkup(country);
    
    // Create a unique price ID based on country and total price
    const priceKey = `phone_${country.toLowerCase()}_${Math.round(pricing.totalPrice * 100)}`;
    
    // Check if we already have this price in Stripe
    const existingPrices = await stripe.prices.search({
      query: `metadata['price_key']:'${priceKey}' AND active:'true'`,
    });
    
    if (existingPrices.data.length > 0) {
      return {
        price: existingPrices.data[0],
        pricing
      };
    }
    
    // Get or create the phone number product
    let product = await getOrCreatePhoneNumberProduct();
    
    // Create new price
    const newPrice = await stripe.prices.create({
      currency: pricing.currency,
      unit_amount: Math.round(pricing.totalPrice * 100), // Convert to cents
      recurring: {
        interval: 'month'
      },
      product: product.id,
      metadata: {
        price_key: priceKey,
        country: country,
        twilio_price: pricing.twilioPrice.toString(),
        markup: pricing.markup.toString(),
        total_price: pricing.totalPrice.toString(),
        type: 'phone_number'
      }
    });
    
    console.log(`Created new Stripe price for ${country} phone numbers: ${newPrice.id} ($${pricing.totalPrice})`);
    
    return {
      price: newPrice,
      pricing
    };
  } catch (error) {
    console.error('Error creating Stripe price for phone number:', error);
    throw error;
  }
}

/**
 * Get or create the main phone number product in Stripe
 */
async function getOrCreatePhoneNumberProduct(): Promise<Stripe.Product> {
  try {
    // Check if product already exists
    const products = await stripe.products.search({
      query: "metadata['type']:'phone_number' AND active:'true'",
    });
    
    if (products.data.length > 0) {
      return products.data[0];
    }
    
    // Create new product
    const product = await stripe.products.create({
      name: 'Phone Number',
      description: 'Monthly phone number service with SMS and voice capabilities',
      metadata: {
        type: 'phone_number'
      }
    });
    
    console.log(`Created new Stripe product for phone numbers: ${product.id}`);
    return product;
  } catch (error) {
    console.error('Error creating phone number product:', error);
    throw error;
  }
}

/**
 * Get pricing for display in the frontend
 */
export async function getPhoneNumberDisplayPricing(country: string = 'US') {
  try {
    const pricing = await getTwilioPricingWithMarkup(country);
    
    return {
      country: pricing.country,
      monthlyPrice: pricing.totalPrice,
      formattedPrice: `$${pricing.totalPrice.toFixed(2)}`,
      breakdown: {
        twilioPrice: pricing.twilioPrice,
        markup: pricing.markup,
        total: pricing.totalPrice
      },
      currency: pricing.currency
    };
  } catch (error) {
    console.error('Error getting display pricing:', error);
    return {
      country: 'US',
      monthlyPrice: 6.75,
      formattedPrice: '$6.75',
      breakdown: {
        twilioPrice: 3.75,
        markup: 3.00,
        total: 6.75
      },
      currency: 'usd'
    };
  }
} 