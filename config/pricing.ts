/**
 * Pricing configuration for the application
 */

// Set to true for beta period (no payments required)
export const BETA_MODE = true;

interface Feature {
  name: string;
  description?: string;
  value?: string | number;
  highlight?: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  price: number;
  features: Feature[];
  popularLabel?: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For individuals and small teams',
    priceLabel: '$69',
    price: 69,
    features: [
      { name: 'Agents', value: '1' },
      { name: 'Messages Included', value: '2,000' },
      { name: 'SMS Messages Included', value: '50' },
      { name: 'Web Searches Included', value: '100' },
      { name: 'Documents Included', value: '1' },
      { name: 'Conversation Summaries Included', value: '50' },
      { name: 'WhatsApp Conversations Included', value: '50' },
      { name: 'Voice Minutes Included', value: '0' },
      { name: 'Overage - Messages', value: '$0.03/message' },
      { name: 'Overage - Web Searches', value: '$0.10/search' },
      { name: 'Overage - Summaries', value: '$0.05/summary' },
      { name: 'Overage - WhatsApp', value: '$0.07/conversation' },
      { name: 'Overage - Voice', value: '$0.15/minute' },
      { name: 'Branding', value: 'Link AI' },
      { name: 'Support', value: 'Standard' },
      { name: 'Phone Numbers', value: '$6.75/month' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For growing businesses and teams',
    priceLabel: '$199',
    price: 199,
    features: [
      { name: 'Agents', value: '3' },
      { name: 'Messages Included', value: '12,000' },
      { name: 'SMS Messages Included', value: '150' },
      { name: 'Web Searches Included', value: '500' },
      { name: 'Documents Included', value: '3' },
      { name: 'Conversation Summaries Included', value: '400' },
      { name: 'WhatsApp Conversations Included', value: '200' },
      { name: 'Voice Minutes Included', value: '50' },
      { name: 'Overage - Messages', value: '$0.03/message' },
      { name: 'Overage - Web Searches', value: '$0.08/search' },
      { name: 'Overage - Summaries', value: '$0.04/summary' },
      { name: 'Overage - WhatsApp', value: '$0.06/conversation' },
      { name: 'Overage - Voice', value: '$0.12/minute' },
      { name: 'Branding', value: 'Minimal' },
      { name: 'Support', value: 'Priority' },
      { name: 'Phone Numbers', value: '$6.75/month' },
    ],
    popularLabel: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'For larger organizations and enterprises',
    priceLabel: '$499',
    price: 499,
    features: [
      { name: 'Agents', value: '10' },
      { name: 'Messages Included', value: '25,000' },
      { name: 'SMS Messages Included', value: '400' },
      { name: 'Web Searches Included', value: '1,000' },
      { name: 'Documents Included', value: '10' },
      { name: 'Conversation Summaries Included', value: '1,000' },
      { name: 'WhatsApp Conversations Included', value: '500' },
      { name: 'Voice Minutes Included', value: '150' },
      { name: 'Overage - Messages', value: '$0.02/message' },
      { name: 'Overage - Web Searches', value: '$0.06/search' },
      { name: 'Overage - Summaries', value: '$0.03/summary' },
      { name: 'Overage - WhatsApp', value: '$0.05/conversation' },
      { name: 'Overage - Voice', value: '$0.10/minute' },
      { name: 'Branding', value: 'No Branding' },
      { name: 'Support', value: 'Dedicated' },
      { name: 'Phone Numbers', value: '$6.75/month' },
    ],
  },
]; 