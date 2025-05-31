#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');
require('dotenv').config();

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Mapping from old price IDs to new price IDs
const PRICE_ID_MAPPING = {
  // Map old BASIC to new STARTER
  [process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID]: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  // Map old HOBBY to new GROWTH
  [process.env.NEXT_PUBLIC_STRIPE_HOBBY_PRICE_ID]: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
  // Map old PRO to new SCALE  
  [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID]: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID,
};

async function migrateToNewPricing() {
  console.log('🚀 Starting migration to new pricing structure...\n');

  try {
    // 1. Check if new environment variables exist
    console.log('1️⃣ Checking environment variables...');
    const requiredNewVars = [
      'NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID', 
      'NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID'
    ];

    const missingVars = requiredNewVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      console.log('\nPlease add these to your .env file:');
      console.log('NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_1RUDYnBMnxCzo29MYxGrDWG7');
      console.log('NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID=price_1RUDYoBMnxCzo29MXVYvVNNv');
      console.log('NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID=price_1RUDYpBMnxCzo29MpWmyrw6f');
      return;
    }
    console.log('✅ All required environment variables present\n');

    // 2. Find all users with old price IDs
    console.log('2️⃣ Finding users with old pricing plans...');
    const usersWithOldPricing = await prisma.user.findMany({
      where: {
        stripePriceId: {
          in: Object.keys(PRICE_ID_MAPPING).filter(Boolean)
        }
      }
    });

    console.log(`Found ${usersWithOldPricing.length} users with old pricing\n`);

    if (usersWithOldPricing.length === 0) {
      console.log('✅ No users found with old pricing. Migration not needed!');
      return;
    }

    // 3. Show migration preview
    console.log('📋 Migration Preview:');
    console.log('====================');
    const planNames = {
      [process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID]: 'BASIC → STARTER ($69)',
      [process.env.NEXT_PUBLIC_STRIPE_HOBBY_PRICE_ID]: 'HOBBY → GROWTH ($199)',
      [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID]: 'PRO → SCALE ($499)',
    };

    usersWithOldPricing.forEach(user => {
      const oldPriceId = user.stripePriceId;
      const migration = planNames[oldPriceId] || 'Unknown plan';
      console.log(`${user.email}: ${migration}`);
    });

    // 4. Ask for confirmation
    console.log('\n⚠️  This will update all users to the new pricing structure.');
    console.log('This includes updating their Stripe subscriptions if active.');
    console.log('\nPress ENTER to continue or Ctrl+C to cancel...');
    
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    // 5. Process each user
    console.log('\n🔄 Processing migrations...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const user of usersWithOldPricing) {
      try {
        console.log(`Processing ${user.email}...`);
        
        const oldPriceId = user.stripePriceId;
        const newPriceId = PRICE_ID_MAPPING[oldPriceId];

        if (!newPriceId) {
          throw new Error(`No mapping found for price ID: ${oldPriceId}`);
        }

        // Update database first
        await prisma.user.update({
          where: { id: user.id },
          data: { stripePriceId: newPriceId }
        });

        // If user has active subscription, update in Stripe
        if (user.stripeSubscriptionId && user.stripeCustomerId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            
            if (subscription.status === 'active' || subscription.status === 'trialing') {
              // Update the subscription item with new price
              await stripe.subscriptions.update(user.stripeSubscriptionId, {
                items: [{
                  id: subscription.items.data[0].id,
                  price: newPriceId,
                }],
                proration_behavior: 'none', // Don't create prorations for migration
              });
              
              console.log(`  ✅ Updated Stripe subscription to new pricing`);
            } else {
              console.log(`  ⚠️  Subscription status: ${subscription.status} (not updated)`);
            }
          } catch (stripeError) {
            console.log(`  ⚠️  Stripe subscription error: ${stripeError.message}`);
          }
        } else {
          console.log(`  ℹ️  No active Stripe subscription to update`);
        }

        console.log(`  ✅ Database updated to new pricing\n`);
        successCount++;
        
      } catch (error) {
        console.error(`  ❌ Error migrating ${user.email}: ${error.message}\n`);
        errors.push({ user: user.email, error: error.message });
        errorCount++;
      }
    }

    // 6. Summary
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    console.log(`✅ Successfully migrated: ${successCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(e => console.log(`  - ${e.user}: ${e.error}`));
    }

    console.log('\n✨ Migration completed!');
    console.log('\nNext steps:');
    console.log('1. Update your code to remove old plan mappings');
    console.log('2. Remove old environment variables from .env');
    console.log('3. Test the billing page to ensure everything works');
    
  } catch (error) {
    console.error('Fatal error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateToNewPricing().catch(console.error);
