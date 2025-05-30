const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugBilling(userEmail) {
  try {
    console.log(`🔍 Debugging billing for user: ${userEmail}\n`);

    // 1. Check user in database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeSubscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
        onboardingCompleted: true,
      }
    });

    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('📊 Database Status:');
    console.log('  User ID:', user.id);
    console.log('  Stripe Customer ID:', user.stripeCustomerId || 'None');
    console.log('  Stripe Subscription ID:', user.stripeSubscriptionId || 'None');
    console.log('  Price ID:', user.stripePriceId || 'None');
    console.log('  Subscription Status:', user.stripeSubscriptionStatus || 'None');
    console.log('  Period End:', user.stripeCurrentPeriodEnd || 'None');
    console.log('  Onboarding Completed:', user.onboardingCompleted);
    console.log('');

    // 2. Check Stripe customer
    if (user.stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);
        console.log('💳 Stripe Customer Status:');
        console.log('  Customer ID:', customer.id);
        console.log('  Email:', customer.email);
        console.log('  Default Payment Method:', customer.invoice_settings?.default_payment_method || 'None');
        
        // Check payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          type: 'card',
        });
        
        console.log('  Payment Methods:', paymentMethods.data.length);
        paymentMethods.data.forEach((pm, index) => {
          console.log(`    ${index + 1}. ${pm.card.brand} ****${pm.card.last4} (${pm.card.exp_month}/${pm.card.exp_year})`);
        });
        console.log('');
      } catch (error) {
        console.log('❌ Error fetching Stripe customer:', error.message);
      }
    }

    // 3. Check Stripe subscription
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        console.log('📋 Stripe Subscription Status:');
        console.log('  Subscription ID:', subscription.id);
        console.log('  Status:', subscription.status);
        console.log('  Current Period Start:', new Date(subscription.current_period_start * 1000).toISOString());
        console.log('  Current Period End:', new Date(subscription.current_period_end * 1000).toISOString());
        console.log('  Trial Start:', subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : 'None');
        console.log('  Trial End:', subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : 'None');
        console.log('  Cancel At Period End:', subscription.cancel_at_period_end);
        
        console.log('  Items:');
        subscription.items.data.forEach((item, index) => {
          console.log(`    ${index + 1}. Price: ${item.price.id} (${item.price.unit_amount / 100} ${item.price.currency.toUpperCase()})`);
        });
        console.log('');
      } catch (error) {
        console.log('❌ Error fetching Stripe subscription:', error.message);
      }
    }

    // 4. Check recent Stripe events
    console.log('🕐 Recent Stripe Events (last 10):');
    const events = await stripe.events.list({
      limit: 10,
      types: [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'setup_intent.succeeded'
      ]
    });

    events.data.forEach((event, index) => {
      const obj = event.data.object;
      const customer = obj.customer;
      if (customer === user.stripeCustomerId) {
        console.log(`  ${index + 1}. ${event.type} - ${new Date(event.created * 1000).toISOString()}`);
        if (event.type.includes('subscription')) {
          console.log(`     Subscription: ${obj.id} (${obj.status})`);
        }
      }
    });

    // 5. Environment check
    console.log('\n🔧 Environment Check:');
    console.log('  STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
    console.log('  STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing');
    console.log('  NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID:', process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '❌ Missing');
    console.log('  NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID:', process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || '❌ Missing');
    console.log('  NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID:', process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID || '❌ Missing');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get user email from command line arguments
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node scripts/debug-billing.js <user-email>');
  console.log('Example: node scripts/debug-billing.js user@example.com');
  process.exit(1);
}

debugBilling(userEmail); 