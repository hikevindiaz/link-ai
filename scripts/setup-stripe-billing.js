const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function main() {
  console.log('🚀 Setting up Stripe billing infrastructure for LinkAI...\n');

  // Check if add-ons should be created
  const createAddons = process.argv.includes('--include-addons');
  
  if (createAddons) {
    console.log('🔌 Add-ons will be created (--include-addons flag detected)');
  } else {
    console.log('⚠️  Add-ons will be skipped (use --include-addons flag to create them)');
  }
  console.log('');

  try {
    // 1. CREATE BASE SUBSCRIPTION PRODUCTS & PRICES
    console.log('📦 Creating base subscription products and prices...\n');

    const subscriptionPlans = [
      {
        name: 'Starter Plan',
        description: 'Perfect for individuals and small teams getting started with AI agents. Includes 1 agent, 2,000 messages, 50 SMS, 100 web searches, and more.',
        price: 6900, // $69.00 in cents
        planId: 'starter',
        metadata: {
          planType: 'subscription',
          planId: 'starter',
          agents: '1',
          messagesIncluded: '2000',
          smsIncluded: '50',
          webSearchesIncluded: '100',
          documentsIncluded: '1',
          summariesIncluded: '50',
          whatsappIncluded: '50',
          voiceMinutesIncluded: '0',
          voices: '1',
          orders: '10',
          forms: '1',
          appointments: '10',
          tickets: '0',
          branding: 'Link AI',
          support: 'Standard'
        }
      },
      {
        name: 'Growth Plan',
        description: 'Ideal for growing businesses that need more agents and advanced features. Includes 5 agents, 12,000 messages, 150 SMS, 500 web searches, and priority support.',
        price: 19900, // $199.00 in cents
        planId: 'growth',
        metadata: {
          planType: 'subscription',
          planId: 'growth',
          agents: '5',
          messagesIncluded: '12000',
          smsIncluded: '150',
          webSearchesIncluded: '500',
          documentsIncluded: '3',
          summariesIncluded: '400',
          whatsappIncluded: '200',
          voiceMinutesIncluded: '50',
          voices: '3',
          orders: 'unlimited',
          forms: '10',
          appointments: 'unlimited',
          tickets: 'unlimited',
          branding: 'Minimal',
          support: 'Priority'
        }
      },
      {
        name: 'Scale Plan',
        description: 'Perfect for enterprises and teams that need maximum capacity and features. Includes 10 agents, 25,000 messages, 400 SMS, 1,000 web searches, and dedicated support.',
        price: 49900, // $499.00 in cents
        planId: 'scale',
        metadata: {
          planType: 'subscription',
          planId: 'scale',
          agents: '10',
          messagesIncluded: '25000',
          smsIncluded: '400',
          webSearchesIncluded: '1000',
          documentsIncluded: '10',
          summariesIncluded: '1000',
          whatsappIncluded: '500',
          voiceMinutesIncluded: '150',
          voices: '6',
          orders: 'unlimited',
          forms: '40',
          appointments: 'unlimited',
          tickets: 'unlimited',
          branding: 'No Branding',
          support: 'Dedicated'
        }
      }
    ];

    const createdPlans = [];

    for (const plan of subscriptionPlans) {
      console.log(`Creating ${plan.name}...`);
      
      // Create product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          ...plan.metadata,
          type: 'base_subscription'
        }
      });

      // Create price
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: plan.price,
        recurring: {
          interval: 'month'
        },
        product: product.id,
        metadata: plan.metadata
      });

      createdPlans.push({
        planId: plan.planId,
        productId: product.id,
        priceId: price.id,
        name: plan.name,
        price: plan.price / 100
      });

      console.log(`✅ Created ${plan.name}: ${price.id} ($${plan.price / 100})`);
    }

    // 2. CREATE OVERAGE PRICING PRODUCTS & PRICES
    console.log('\n💰 Creating overage pricing products and prices...\n');

    const overageProducts = [
      {
        name: 'Message Overage',
        description: 'Additional messages beyond plan limits',
        unit: 'message',
        prices: [
          { planTier: 'starter', unitAmount: 3 }, // $0.03
          { planTier: 'growth', unitAmount: 3 },  // $0.03
          { planTier: 'scale', unitAmount: 2 }    // $0.02
        ]
      },
      {
        name: 'Web Search Overage',
        description: 'Additional web searches beyond plan limits',
        unit: 'search',
        prices: [
          { planTier: 'starter', unitAmount: 10 }, // $0.10
          { planTier: 'growth', unitAmount: 8 },   // $0.08
          { planTier: 'scale', unitAmount: 6 }     // $0.06
        ]
      },
      {
        name: 'Conversation Summary Overage',
        description: 'Additional conversation summaries beyond plan limits',
        unit: 'summary',
        prices: [
          { planTier: 'starter', unitAmount: 5 }, // $0.05
          { planTier: 'growth', unitAmount: 4 },  // $0.04
          { planTier: 'scale', unitAmount: 3 }    // $0.03
        ]
      },
      {
        name: 'WhatsApp Conversation Overage',
        description: 'Additional WhatsApp conversations beyond plan limits',
        unit: 'whatsapp_conversation',
        prices: [
          { planTier: 'starter', unitAmount: 7 }, // $0.07
          { planTier: 'growth', unitAmount: 6 },  // $0.06
          { planTier: 'scale', unitAmount: 5 }    // $0.05
        ]
      },
      {
        name: 'Voice Minute Overage',
        description: 'Additional voice minutes beyond plan limits',
        unit: 'voice_minute',
        prices: [
          { planTier: 'starter', unitAmount: 15 }, // $0.15
          { planTier: 'growth', unitAmount: 12 },  // $0.12
          { planTier: 'scale', unitAmount: 10 }    // $0.10
        ]
      },
      {
        name: 'SMS Overage',
        description: 'Additional SMS messages beyond plan limits',
        unit: 'sms',
        prices: [
          { planTier: 'starter', unitAmount: 8 }, // $0.08
          { planTier: 'growth', unitAmount: 8 },  // $0.08
          { planTier: 'scale', unitAmount: 6 }    // $0.06
        ]
      }
    ];

    const createdOverages = [];

    for (const overageProduct of overageProducts) {
      console.log(`Creating ${overageProduct.name}...`);
      
      // Create product
      const product = await stripe.products.create({
        name: overageProduct.name,
        description: overageProduct.description,
        metadata: {
          type: 'overage',
          unit: overageProduct.unit
        }
      });

      const productPrices = [];

      // Create prices for each tier
      for (const tierPrice of overageProduct.prices) {
        const price = await stripe.prices.create({
          currency: 'usd',
          unit_amount: tierPrice.unitAmount, // Already in cents
          product: product.id,
          metadata: {
            type: 'overage',
            unit: overageProduct.unit,
            planTier: tierPrice.planTier
          }
        });

        productPrices.push({
          planTier: tierPrice.planTier,
          priceId: price.id,
          unitAmount: tierPrice.unitAmount
        });

        console.log(`  ✅ ${tierPrice.planTier}: ${price.id} ($${(tierPrice.unitAmount / 100).toFixed(2)})`);
      }

      createdOverages.push({
        unit: overageProduct.unit,
        productId: product.id,
        name: overageProduct.name,
        prices: productPrices
      });
    }

    let createdAddons = [];

    // 3. CREATE ADD-ON PRODUCTS (Only if requested)
    if (createAddons) {
      console.log('\n🔌 Creating add-on products for future integrations...\n');

      const addonProducts = [
        {
          name: 'Zapier Integration',
          description: 'Connect your agents to 5,000+ apps with Zapier integration',
          price: 1500, // $15.00/month
          metadata: {
            type: 'addon',
            integration: 'zapier',
            category: 'automation'
          }
        },
        {
          name: 'Slack Integration',
          description: 'Deploy your agents directly in Slack channels and DMs',
          price: 1000, // $10.00/month
          metadata: {
            type: 'addon',
            integration: 'slack',
            category: 'messaging'
          }
        },
        {
          name: 'Microsoft Teams Integration',
          description: 'Deploy your agents in Microsoft Teams for enterprise workflows',
          price: 1500, // $15.00/month
          metadata: {
            type: 'addon',
            integration: 'teams',
            category: 'messaging'
          }
        },
        {
          name: 'Advanced Analytics',
          description: 'Detailed conversation analytics, sentiment analysis, and performance insights',
          price: 2500, // $25.00/month
          metadata: {
            type: 'addon',
            integration: 'analytics',
            category: 'insights'
          }
        },
        {
          name: 'Custom Model Training',
          description: 'Train custom AI models on your specific data and use cases',
          price: 10000, // $100.00/month
          metadata: {
            type: 'addon',
            integration: 'custom_training',
            category: 'ai'
          }
        }
      ];

      for (const addon of addonProducts) {
        console.log(`Creating ${addon.name}...`);
        
        // Create product
        const product = await stripe.products.create({
          name: addon.name,
          description: addon.description,
          metadata: addon.metadata
        });

        // Create price
        const price = await stripe.prices.create({
          currency: 'usd',
          unit_amount: addon.price,
          recurring: {
            interval: 'month'
          },
          product: product.id,
          metadata: addon.metadata
        });

        createdAddons.push({
          name: addon.name,
          productId: product.id,
          priceId: price.id,
          price: addon.price / 100,
          integration: addon.metadata.integration
        });

        console.log(`✅ Created ${addon.name}: ${price.id} ($${addon.price / 100})`);
      }
    } else {
      console.log('\n⏭️  Skipping add-on products (use --include-addons to create them)');
    }

    // 4. GENERATE ENVIRONMENT VARIABLES
    console.log('\n🔧 Environment Variables for .env file:\n');
    console.log('# Base Subscription Plans');
    createdPlans.forEach(plan => {
      const envVar = `NEXT_PUBLIC_STRIPE_${plan.planId.toUpperCase()}_PRICE_ID`;
      console.log(`${envVar}=${plan.priceId}`);
    });

    console.log('\n# Overage Pricing (you can add these to your code)');
    createdOverages.forEach(overage => {
      overage.prices.forEach(price => {
        const envVar = `STRIPE_${overage.unit.toUpperCase()}_${price.planTier.toUpperCase()}_PRICE_ID`;
        console.log(`# ${envVar}=${price.priceId}`);
      });
    });

    if (createAddons && createdAddons.length > 0) {
      console.log('\n# Add-on Products');
      createdAddons.forEach(addon => {
        const envVar = `STRIPE_${addon.integration.toUpperCase()}_ADDON_PRICE_ID`;
        console.log(`# ${envVar}=${addon.priceId}`);
      });
    }

    // 5. GENERATE CONFIGURATION FILE
    console.log('\n📝 Generating Stripe configuration file...\n');

    const config = {
      subscriptionPlans: createdPlans,
      overagePricing: createdOverages,
      addons: createdAddons,
      generatedAt: new Date().toISOString()
    };

    const fs = require('fs');
    fs.writeFileSync('stripe-billing-config.json', JSON.stringify(config, null, 2));
    console.log('✅ Configuration saved to stripe-billing-config.json');

    // 6. SUMMARY
    console.log('\n🎉 Stripe billing setup completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Base Plans: ${createdPlans.length}`);
    console.log(`   Overage Products: ${createdOverages.length}`);
    console.log(`   Add-on Products: ${createdAddons.length}`);
    console.log(`   Total Prices Created: ${
      createdPlans.length + 
      createdOverages.reduce((acc, p) => acc + p.prices.length, 0) + 
      createdAddons.length
    }\n`);

    console.log('🔧 Next Steps:');
    console.log('1. Add the environment variables above to your .env file');
    console.log('2. Update your billing components to use the new plans');
    console.log('3. Test the subscription flow with the new pricing');
    console.log('4. Implement usage tracking for overage billing');
    
    if (createAddons) {
      console.log('5. Create UI for add-on management');
    } else {
      console.log('5. Run with --include-addons flag when ready for integrations');
    }
    
    console.log('\n💡 Cleanup Commands:');
    console.log('• To analyze your Stripe account: node scripts/cleanup-old-stripe-prices.js');
    console.log('• To remove add-ons: node scripts/cleanup-stripe-addons.js');
    console.log('');

  } catch (error) {
    console.error('❌ Error setting up Stripe billing:', error);
  }
}

main().catch(console.error); 