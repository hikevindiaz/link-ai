import * as Twilio from 'twilio';

async function checkTwilioLogs() {
  try {
    console.log('📱 Checking Twilio SMS logs for the last hour...\n');
    
    // Check environment variables first
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ Missing Twilio credentials in environment variables');
      return;
    }
    
    console.log(`Using Account SID: ${process.env.TWILIO_ACCOUNT_SID}`);
    
    // Check subaccount if specified, otherwise use main account
    const subAccountSid = process.env.TWILIO_SUBACCOUNT_SID;
    if (subAccountSid) {
      console.log(`\n🔍 Checking subaccount ${subAccountSid}...`);
      try {
        const subClient = Twilio.default(
          process.env.TWILIO_ACCOUNT_SID as string,
          process.env.TWILIO_AUTH_TOKEN as string,
          { accountSid: subAccountSid }
        );
        
        const subMessages = await subClient.messages.list({
          dateSentAfter: new Date(Date.now() - 2 * 60 * 60 * 1000), // Last 2 hours
          limit: 20
        });
        
        console.log(`Found ${subMessages.length} messages in subaccount:`);
        for (const msg of subMessages) {
          const dateStr = msg.dateCreated ? msg.dateCreated.toISOString() : 'Unknown date';
          console.log(`\n📱 Message ${msg.sid}:`);
          console.log(`   📅 Date: ${dateStr}`);
          console.log(`   📞 From: ${msg.from} -> To: ${msg.to}`);
          console.log(`   📊 Status: ${msg.status}`);
          console.log(`   💰 Price: ${msg.price} ${msg.priceUnit || 'USD'}`);
          
          if (msg.errorCode) {
            console.log(`   ❌ Error: ${msg.errorCode} - ${msg.errorMessage}`);
          }
          if (msg.body) {
            console.log(`   📝 Body: ${msg.body}`);
          }
        }
        
        if (subMessages.length === 0) {
          console.log('   ℹ️  No messages found in the last 2 hours');
          
          // Try to get ANY recent messages to see if there are any at all
          console.log('\n🔍 Checking for any messages in the last 24 hours...');
          const allMessages = await subClient.messages.list({
            dateSentAfter: new Date(Date.now() - 24 * 60 * 60 * 1000),
            limit: 5
          });
          
          console.log(`Found ${allMessages.length} messages in last 24 hours:`);
          for (const msg of allMessages) {
            const dateStr = msg.dateCreated ? msg.dateCreated.toISOString() : 'Unknown date';
            console.log(`   - ${dateStr}: ${msg.from} -> ${msg.to} [${msg.status}]`);
          }
        }
        
      } catch (error) {
        console.log(`  ❌ Error accessing subaccount: ${error}`);
      }
    } else {
      console.log('\n🔍 Checking main account (no subaccount specified)...');
      // Use main account if no subaccount specified
      const client = Twilio.default(
        process.env.TWILIO_ACCOUNT_SID as string,
        process.env.TWILIO_AUTH_TOKEN as string
      );
      
      const messages = await client.messages.list({
        dateSentAfter: new Date(Date.now() - 2 * 60 * 60 * 1000),
        limit: 20
      });
      
      console.log(`Found ${messages.length} messages in main account:`);
      for (const msg of messages) {
        const dateStr = msg.dateCreated ? msg.dateCreated.toISOString() : 'Unknown date';
        console.log(`\n📱 Message ${msg.sid}:`);
        console.log(`   📅 Date: ${dateStr}`);
        console.log(`   📞 From: ${msg.from} -> To: ${msg.to}`);
        console.log(`   📊 Status: ${msg.status}`);
        console.log(`   💰 Price: ${msg.price} ${msg.priceUnit || 'USD'}`);
        
        if (msg.errorCode) {
          console.log(`   ❌ Error: ${msg.errorCode} - ${msg.errorMessage}`);
        }
        if (msg.body) {
          console.log(`   📝 Body: ${msg.body}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking Twilio logs:', error);
  }
}

// Run the check
if (require.main === module) {
  checkTwilioLogs().catch(console.error);
}

export { checkTwilioLogs }; 