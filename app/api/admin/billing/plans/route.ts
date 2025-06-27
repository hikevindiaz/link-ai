import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock plans data - replace with actual Stripe integration
    const plans = [
      {
        id: 'price_starter_monthly',
        name: 'Starter Plan',
        description: 'Perfect for individuals and small teams getting started with AI',
        price: 6900, // $69.00
        currency: 'usd',
        interval: 'month',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        metadata: {
          agents: '3',
          messagesIncluded: '2500',
          smsIncluded: '100',
          webSearchesIncluded: '500',
          voiceMinutesIncluded: '60',
          whatsappConversationsIncluded: '100',
          summariesIncluded: '100',
          storageIncluded: '5', // GB
          knowledgeSourcesIncluded: '10',
          integrationsIncluded: '3',
          formsIncluded: '3',
          appointmentsIncluded: '25',
          ticketsIncluded: '0',
          ordersIncluded: '25',
          voicesIncluded: '3',
          // Overage rates in cents
          messagesOverageRate: '3',
          smsOverageRate: '8',
          webSearchesOverageRate: '10',
          voiceMinutesOverageRate: '15',
          whatsappConversationsOverageRate: '7',
          summariesOverageRate: '5',
          storageOverageRate: '50',
          // Features
          premiumSupport: 'false',
          brandingCustomization: 'false',
          advancedAnalytics: 'false',
          customTraining: 'false',
          prioritySupport: 'false',
          apiAccess: 'false',
          webhooks: 'false',
          sso: 'false',
          customDomain: 'false',
        },
        customerCount: 156,
      },
      {
        id: 'price_growth_monthly',
        name: 'Growth Plan',
        description: 'Ideal for growing businesses that need more power and flexibility',
        price: 19900, // $199.00
        currency: 'usd',
        interval: 'month',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        metadata: {
          agents: '10',
          messagesIncluded: '10000',
          smsIncluded: '500',
          webSearchesIncluded: '2000',
          voiceMinutesIncluded: '300',
          whatsappConversationsIncluded: '500',
          summariesIncluded: '500',
          storageIncluded: '25', // GB
          knowledgeSourcesIncluded: '50',
          integrationsIncluded: '10',
          formsIncluded: '10',
          appointmentsIncluded: '100',
          ticketsIncluded: '50',
          ordersIncluded: '100',
          voicesIncluded: '10',
          // Overage rates in cents
          messagesOverageRate: '3',
          smsOverageRate: '8',
          webSearchesOverageRate: '10',
          voiceMinutesOverageRate: '15',
          whatsappConversationsOverageRate: '7',
          summariesOverageRate: '5',
          storageOverageRate: '50',
          // Features
          premiumSupport: 'true',
          brandingCustomization: 'true',
          advancedAnalytics: 'true',
          customTraining: 'false',
          prioritySupport: 'false',
          apiAccess: 'true',
          webhooks: 'true',
          sso: 'false',
          customDomain: 'false',
        },
        customerCount: 89,
      },
      {
        id: 'price_scale_monthly',
        name: 'Scale Plan',
        description: 'Enterprise-grade solution for large teams and organizations',
        price: 49900, // $499.00
        currency: 'usd',
        interval: 'month',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        metadata: {
          agents: '50',
          messagesIncluded: '50000',
          smsIncluded: '2500',
          webSearchesIncluded: '10000',
          voiceMinutesIncluded: '1500',
          whatsappConversationsIncluded: '2500',
          summariesIncluded: '2500',
          storageIncluded: '100', // GB
          knowledgeSourcesIncluded: '200',
          integrationsIncluded: '20',
          formsIncluded: '-1', // Unlimited
          appointmentsIncluded: '-1', // Unlimited
          ticketsIncluded: '-1', // Unlimited
          ordersIncluded: '-1', // Unlimited
          voicesIncluded: '50',
          // Overage rates in cents
          messagesOverageRate: '2',
          smsOverageRate: '6',
          webSearchesOverageRate: '8',
          voiceMinutesOverageRate: '12',
          whatsappConversationsOverageRate: '5',
          summariesOverageRate: '3',
          storageOverageRate: '40',
          // Features
          premiumSupport: 'true',
          brandingCustomization: 'true',
          advancedAnalytics: 'true',
          customTraining: 'true',
          prioritySupport: 'true',
          apiAccess: 'true',
          webhooks: 'true',
          sso: 'true',
          customDomain: 'true',
        },
        customerCount: 34,
      },
    ];

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      price, 
      currency, 
      interval,
      maxAgents,
      maxMessages,
      maxSMS,
      maxFiles,
      maxStorage,
      maxWebSearches,
      maxVoiceMinutes,
      maxWhatsAppConversations,
      maxConversationSummaries,
      maxVoices,
      maxOrders,
      maxForms,
      maxAppointments,
      maxTickets,
      maxKnowledgeSources,
      maxIntegrations,
      overageRates,
      includedAddOns,
      features
    } = body;

    if (!name || !description || typeof price !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert configuration to Stripe metadata format
    const metadata: Record<string, string> = {
      agents: maxAgents?.toString() || '1',
      messagesIncluded: maxMessages?.toString() || '1000',
      smsIncluded: maxSMS?.toString() || '25',
      filesIncluded: maxFiles?.toString() || '5',
      storageIncluded: maxStorage?.toString() || '1',
      webSearchesIncluded: maxWebSearches?.toString() || '50',
      voiceMinutesIncluded: maxVoiceMinutes?.toString() || '0',
      whatsappConversationsIncluded: maxWhatsAppConversations?.toString() || '25',
      summariesIncluded: maxConversationSummaries?.toString() || '25',
      voicesIncluded: maxVoices?.toString() || '1',
      ordersIncluded: maxOrders?.toString() || '5',
      formsIncluded: maxForms?.toString() || '1',
      appointmentsIncluded: maxAppointments?.toString() || '5',
      ticketsIncluded: maxTickets?.toString() || '0',
      knowledgeSourcesIncluded: maxKnowledgeSources?.toString() || '3',
      integrationsIncluded: maxIntegrations?.toString() || '1',
    };

    // Add overage rates to metadata
    if (overageRates) {
      overageRates.forEach((rate: any) => {
        if (rate.enabled) {
          metadata[`${rate.type}OverageRate`] = rate.rate.toString();
        }
      });
    }

    // Add features to metadata
    if (features) {
      Object.entries(features).forEach(([key, value]) => {
        metadata[key] = value?.toString() || 'false';
      });
    }

    // Add included add-ons to metadata
    if (includedAddOns && includedAddOns.length > 0) {
      metadata.includedAddOns = includedAddOns.join(',');
    }

    // Mock plan creation - replace with actual Stripe integration
    const newPlan = {
      id: `price_${name.toLowerCase().replace(/\s+/g, '_')}_${interval}_${Date.now()}`,
      name,
      description,
      price,
      currency: currency || 'usd',
      interval: interval || 'month',
      active: true,
      createdAt: new Date().toISOString(),
      metadata,
      customerCount: 0,
    };

    // Here you would create the product and price in Stripe:
    // const stripeProduct = await stripe.products.create({
    //   name,
    //   description,
    //   metadata
    // });
    //
    // const stripePrice = await stripe.prices.create({
    //   product: stripeProduct.id,
    //   unit_amount: price,
    //   currency,
    //   recurring: { interval }
    // });

    return NextResponse.json({ plan: newPlan }, { status: 201 });
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 