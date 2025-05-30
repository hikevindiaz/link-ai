const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function fixBrokenSubscriptionItems() {
  console.log('🔍 Finding phone numbers with broken subscription item references...\n');
  
  try {
    // Find all phone numbers that have subscription item IDs
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      where: {
        subscriptionItemId: {
          not: null
        }
      },
      include: {
        subscriptionItem: true,
        user: true
      }
    });
    
    console.log(`Found ${phoneNumbers.length} phone numbers with subscription item references`);
    
    for (const phone of phoneNumbers) {
      console.log(`\n📱 Checking phone number: ${phone.phoneNumber}`);
      console.log(`   User: ${phone.user.email}`);
      console.log(`   Subscription Item ID: ${phone.subscriptionItemId}`);
      
      if (!phone.subscriptionItem) {
        console.log(`   ❌ Subscription item not found in database!`);
        
        // Remove the broken reference
        await prisma.twilioPhoneNumber.update({
          where: { id: phone.id },
          data: { subscriptionItemId: null }
        });
        
        console.log(`   ✅ Removed broken subscription item reference`);
        continue;
      }
      
      const subscriptionItem = phone.subscriptionItem;
      console.log(`   Stripe Subscription Item ID: ${subscriptionItem.stripeSubscriptionItemId}`);
      
      // Check if the subscription item exists in Stripe
      try {
        const stripeItem = await stripe.subscriptionItems.retrieve(subscriptionItem.stripeSubscriptionItemId);
        console.log(`   ✅ Subscription item exists in Stripe (Quantity: ${stripeItem.quantity})`);
      } catch (stripeError) {
        console.log(`   ❌ Subscription item NOT found in Stripe: ${stripeError.message}`);
        
        // Mark the subscription item as inactive in our database
        await prisma.subscriptionItem.update({
          where: { id: subscriptionItem.id },
          data: { 
            isActive: false,
            updatedAt: new Date()
          }
        });
        
        // Remove the reference from the phone number
        await prisma.twilioPhoneNumber.update({
          where: { id: phone.id },
          data: { subscriptionItemId: null }
        });
        
        console.log(`   ✅ Marked subscription item as inactive and removed phone number reference`);
        console.log(`   ⚠️  This phone number will now show as "suspended" until a new subscription item is created`);
      }
    }
    
    console.log('\n🎉 Cleanup completed!');
    console.log('\nNext steps:');
    console.log('1. Users can delete and re-purchase phone numbers that were affected');
    console.log('2. Or create new subscription items for existing phone numbers if needed');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
fixBrokenSubscriptionItems().catch(console.error); 