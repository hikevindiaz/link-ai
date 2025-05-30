const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function main() {
  console.log('🔧 Starting Phone Number Status Repair...\n');

  try {
    // Get all suspended phone numbers where user has payment methods
    const suspendedNumbers = await prisma.twilioPhoneNumber.findMany({
      where: { status: 'suspended' },
      include: {
        user: {
          include: { paymentMethods: true }
        }
      }
    });

    console.log(`Found ${suspendedNumbers.length} suspended phone numbers`);

    let fixedCount = 0;
    let warningCount = 0;

    for (const phoneNumber of suspendedNumbers) {
      console.log(`\nChecking: ${phoneNumber.phoneNumber} (${phoneNumber.user.email})`);

      // If user has payment methods and active subscription, reactivate
      if (phoneNumber.user.paymentMethods.length > 0 && phoneNumber.user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(phoneNumber.user.stripeSubscriptionId);
          
          if (subscription.status === 'active') {
            console.log(`  ✅ Reactivating - user has active subscription`);
            
            await prisma.twilioPhoneNumber.update({
              where: { id: phoneNumber.id },
              data: { 
                status: 'active',
                updatedAt: new Date()
              }
            });
            
            console.log(`  ✅ Status updated to active`);
            fixedCount++;
          } else {
            console.log(`  ⚠️  Subscription status: ${subscription.status} - setting to warning`);
            
            await prisma.twilioPhoneNumber.update({
              where: { id: phoneNumber.id },
              data: { 
                status: 'warning',
                updatedAt: new Date()
              }
            });
            
            warningCount++;
          }
        } catch (error) {
          console.log(`  ❌ Error checking subscription: ${error.message}`);
        }
      } else if (phoneNumber.user.paymentMethods.length > 0) {
        // User has payment methods but no subscription - set to warning
        console.log(`  ⚠️  Has payment methods but no subscription - setting to warning`);
        
        await prisma.twilioPhoneNumber.update({
          where: { id: phoneNumber.id },
          data: { 
            status: 'warning',
            updatedAt: new Date()
          }
        });
        
        warningCount++;
      } else {
        console.log(`  ⚠️  No payment methods or subscription - keeping suspended`);
      }
    }

    console.log('\n✅ Phone number status repair completed!');
    console.log(`📊 Summary:`);
    console.log(`   Fixed to active: ${fixedCount}`);
    console.log(`   Set to warning: ${warningCount}`);
    console.log(`   Kept suspended: ${suspendedNumbers.length - fixedCount - warningCount}`);

  } catch (error) {
    console.error('❌ Error during repair:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error); 