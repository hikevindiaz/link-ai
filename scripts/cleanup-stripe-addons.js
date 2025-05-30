const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function cleanupAddons() {
  console.log('🧹 Cleaning up Stripe add-on products and prices...\n');

  try {
    // Get all products
    console.log('📦 Fetching all products...');
    const products = await stripe.products.list({ limit: 100 });
    
    // Find add-on products (created with type: 'addon')
    const addonProducts = products.data.filter(product => 
      product.metadata?.type === 'addon'
    );

    console.log(`Found ${addonProducts.length} add-on products to remove:\n`);

    for (const product of addonProducts) {
      console.log(`🗑️  Removing: ${product.name} (${product.id})`);
      
      try {
        // First, get all prices for this product
        const prices = await stripe.prices.list({ 
          product: product.id,
          limit: 100 
        });

        // Archive all prices for this product
        for (const price of prices.data) {
          if (price.active) {
            await stripe.prices.update(price.id, { active: false });
            console.log(`   ✅ Archived price: ${price.id}`);
          }
        }

        // Archive the product
        await stripe.products.update(product.id, { active: false });
        console.log(`   ✅ Archived product: ${product.id}\n`);

      } catch (error) {
        console.error(`   ❌ Error removing ${product.name}:`, error.message);
      }
    }

    if (addonProducts.length === 0) {
      console.log('✅ No add-on products found to remove.');
    } else {
      console.log(`🎉 Cleanup completed! Archived ${addonProducts.length} add-on products.`);
    }

    console.log('\n📝 Note: Products and prices are archived (not deleted) for data integrity.');
    console.log('They will no longer appear in your dashboard or be available for new subscriptions.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupAddons().catch(console.error); 