const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function analyzeStripeAccount() {
  console.log('🔍 Analyzing your Stripe account for cleanup opportunities...\n');

  try {
    // Get all products and prices
    console.log('📦 Fetching all products and prices...');
    const [products, prices, subscriptions] = await Promise.all([
      stripe.products.list({ limit: 100 }),
      stripe.prices.list({ limit: 100 }),
      stripe.subscriptions.list({ limit: 100, status: 'all' })
    ]);

    console.log(`Found ${products.data.length} products, ${prices.data.length} prices, ${subscriptions.data.length} subscriptions\n`);

    // Analyze products
    console.log('📊 PRODUCT ANALYSIS:');
    console.log('===================');
    
    const activeProducts = products.data.filter(p => p.active);
    const inactiveProducts = products.data.filter(p => !p.active);
    
    console.log(`Active products: ${activeProducts.length}`);
    console.log(`Inactive products: ${inactiveProducts.length}`);
    
    // Show all products with their creation date and metadata
    console.log('\n📋 All Products:');
    products.data.forEach(product => {
      const createdDate = new Date(product.created * 1000).toLocaleDateString();
      const type = product.metadata?.type || 'unknown';
      const status = product.active ? '✅ Active' : '❌ Inactive';
      console.log(`  ${status} | ${product.name} | Type: ${type} | Created: ${createdDate} | ID: ${product.id}`);
    });

    // Analyze prices
    console.log('\n💰 PRICE ANALYSIS:');
    console.log('==================');
    
    const activePrices = prices.data.filter(p => p.active);
    const inactivePrices = prices.data.filter(p => !p.active);
    
    console.log(`Active prices: ${activePrices.length}`);
    console.log(`Inactive prices: ${inactivePrices.length}`);

    // Find prices that are currently being used in subscriptions
    const pricesInUse = new Set();
    subscriptions.data.forEach(sub => {
      sub.items.data.forEach(item => {
        pricesInUse.add(item.price.id);
      });
    });

    console.log(`Prices currently in use: ${pricesInUse.size}`);

    // Categorize prices
    const unusedActivePrices = activePrices.filter(p => !pricesInUse.has(p.id));
    const legacyPrices = prices.data.filter(p => {
      const createdDate = new Date(p.created * 1000);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return createdDate < sixMonthsAgo && !pricesInUse.has(p.id);
    });

    console.log('\n🔍 CLEANUP OPPORTUNITIES:');
    console.log('=========================');
    
    // Show add-on products (safe to remove)
    const addonProducts = products.data.filter(p => p.metadata?.type === 'addon');
    if (addonProducts.length > 0) {
      console.log(`\n🎯 Add-on products (safe to remove): ${addonProducts.length}`);
      addonProducts.forEach(product => {
        console.log(`  - ${product.name} (${product.id})`);
      });
    }

    // Show unused active prices
    if (unusedActivePrices.length > 0) {
      console.log(`\n⚠️  Unused active prices: ${unusedActivePrices.length}`);
      unusedActivePrices.forEach(price => {
        const product = products.data.find(p => p.id === price.product);
        const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'Free';
        const createdDate = new Date(price.created * 1000).toLocaleDateString();
        console.log(`  - ${product?.name || 'Unknown Product'} | ${amount} | Created: ${createdDate} | ID: ${price.id}`);
      });
    }

    // Show legacy prices
    if (legacyPrices.length > 0) {
      console.log(`\n🗃️  Legacy prices (older than 6 months, unused): ${legacyPrices.length}`);
      legacyPrices.forEach(price => {
        const product = products.data.find(p => p.id === price.product);
        const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'Free';
        const createdDate = new Date(price.created * 1000).toLocaleDateString();
        console.log(`  - ${product?.name || 'Unknown Product'} | ${amount} | Created: ${createdDate} | ID: ${price.id}`);
      });
    }

    // Current LinkAI plans
    console.log('\n🎯 CURRENT LINKAI PLANS:');
    console.log('========================');
    const linkaiPlans = products.data.filter(p => 
      p.active && (
        p.metadata?.planType === 'subscription' || 
        p.name.toLowerCase().includes('starter') ||
        p.name.toLowerCase().includes('growth') ||
        p.name.toLowerCase().includes('scale') ||
        p.name.toLowerCase().includes('basic') ||
        p.name.toLowerCase().includes('pro') ||
        p.name.toLowerCase().includes('hobby')
      )
    );

    linkaiPlans.forEach(product => {
      const price = prices.data.find(p => p.product === product.id && p.active);
      const amount = price?.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}/month` : 'No active price';
      const planId = product.metadata?.planId || 'Unknown';
      const inUse = price ? (pricesInUse.has(price.id) ? '✅ In Use' : '⚠️  Unused') : '';
      console.log(`  - ${product.name} | ${planId} | ${amount} | ${inUse}`);
    });

    // Generate cleanup script
    console.log('\n🛠️  CLEANUP RECOMMENDATIONS:');
    console.log('============================');
    
    if (addonProducts.length > 0) {
      console.log(`\n1. Run: node scripts/cleanup-stripe-addons.js`);
      console.log(`   This will archive ${addonProducts.length} add-on products that aren't needed yet.`);
    }

    if (unusedActivePrices.length > 5) {
      console.log(`\n2. Consider archiving ${unusedActivePrices.length} unused active prices to declutter your dashboard.`);
      console.log(`   ⚠️  CAUTION: Only archive prices you're certain you won't use again.`);
    }

    if (legacyPrices.length > 0) {
      console.log(`\n3. Consider archiving ${legacyPrices.length} legacy prices (older than 6 months).`);
    }

    console.log('\n💡 SAFETY NOTES:');
    console.log('================');
    console.log('• Prices are archived, not deleted (for data integrity)');
    console.log('• Archived prices cannot be used for new subscriptions');
    console.log('• Existing subscriptions with archived prices continue to work');
    console.log('• You can reactivate archived prices if needed');

  } catch (error) {
    console.error('❌ Error analyzing Stripe account:', error);
  }
}

async function interactiveCleanup() {
  console.log('🧹 INTERACTIVE STRIPE CLEANUP');
  console.log('=============================\n');

  await analyzeStripeAccount();

  console.log('\n🤖 Want to proceed with automatic cleanup?');
  console.log('This will ONLY remove the add-on products that were created but aren\'t needed yet.');
  console.log('\nPress Ctrl+C to cancel, or any key + Enter to continue...');

  // Wait for user input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', async () => {
    console.log('\n🚀 Starting cleanup...\n');
    
    try {
      // Only cleanup add-ons for now
      const products = await stripe.products.list({ limit: 100 });
      const addonProducts = products.data.filter(product => 
        product.metadata?.type === 'addon'
      );

      if (addonProducts.length === 0) {
        console.log('✅ No add-on products found to clean up.');
        process.exit(0);
      }

      console.log(`Archiving ${addonProducts.length} add-on products...`);

      for (const product of addonProducts) {
        try {
          // Get and archive prices
          const prices = await stripe.prices.list({ product: product.id });
          for (const price of prices.data) {
            if (price.active) {
              await stripe.prices.update(price.id, { active: false });
            }
          }

          // Archive product
          await stripe.products.update(product.id, { active: false });
          console.log(`✅ Archived: ${product.name}`);
        } catch (error) {
          console.error(`❌ Error archiving ${product.name}:`, error.message);
        }
      }

      console.log('\n🎉 Cleanup completed successfully!');
      console.log('Your Stripe dashboard should now be cleaner.');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
    
    process.exit(0);
  });
}

// Run analysis by default, interactive cleanup if --cleanup flag
if (process.argv.includes('--cleanup')) {
  interactiveCleanup().catch(console.error);
} else {
  analyzeStripeAccount().catch(console.error);
} 