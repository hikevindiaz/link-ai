import twilio from 'twilio';
import prisma from '../lib/prisma';
import { TwilioWebhookManager } from '../lib/twilio/webhook-manager';

async function verifyAndFixWebhooks() {
  console.log('🔍 Verifying and fixing Twilio webhooks...\n');
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.error('❌ Twilio credentials not found in environment variables');
    return;
  }
  
  const client = twilio(accountSid, authToken);
  const webhookManager = new TwilioWebhookManager();
  
  try {
    // Get all phone numbers from database
    const dbPhoneNumbers = await prisma.twilioPhoneNumber.findMany({
      include: { chatbot: true }
    });
    
    console.log(`📱 Found ${dbPhoneNumbers.length} phone numbers in database\n`);
    
    // Get all phone numbers from Twilio
    const twilioNumbers = await client.incomingPhoneNumbers.list();
    console.log(`☎️  Found ${twilioNumbers.length} phone numbers in Twilio\n`);
    
    // Check each database phone number
    for (const dbNumber of dbPhoneNumbers) {
      console.log(`\n📞 Checking ${dbNumber.phoneNumber}...`);
      
      const twilioNumber = twilioNumbers.find(tn => tn.phoneNumber === dbNumber.phoneNumber);
      
      if (!twilioNumber) {
        console.log(`  ❌ Not found in Twilio account`);
        continue;
      }
      
      console.log(`  ✅ Found in Twilio (SID: ${twilioNumber.sid})`);
      console.log(`  📋 Agent: ${dbNumber.chatbot.name} (${dbNumber.chatbotId})`);
      
      // Check current webhook configuration
      console.log(`\n  Current webhooks:`);
      console.log(`    Voice URL: ${twilioNumber.voiceUrl || 'Not set'}`);
      console.log(`    SMS URL: ${twilioNumber.smsUrl || 'Not set'}`);
      
      // Check if webhooks need updating
      // NOTE: We don't include agentId in the URL - the webhook looks up the agent by phone number
      const expectedVoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`;
      const needsUpdate = twilioNumber.voiceUrl !== expectedVoiceUrl;
      
      if (needsUpdate) {
        console.log(`\n  ⚠️  Webhooks need updating`);
        console.log(`    Expected: ${expectedVoiceUrl}`);
        console.log(`    Actual: ${twilioNumber.voiceUrl}`);
        
        // Fix the webhooks
        console.log(`\n  🔧 Updating webhooks...`);
        try {
          await webhookManager.configurePhoneNumberWebhooks(
            dbNumber.phoneNumber,
            dbNumber.chatbotId,
            {
              voice: true,
              sms: dbNumber.chatbot.smsEnabled || false,
              whatsapp: dbNumber.chatbot.whatsappEnabled || false
            }
          );
          console.log(`  ✅ Webhooks updated successfully`);
        } catch (error) {
          console.error(`  ❌ Failed to update webhooks: ${error.message}`);
        }
      } else {
        console.log(`  ✅ Webhooks are correctly configured`);
      }
    }
    
    console.log('\n\n✅ Webhook verification complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
verifyAndFixWebhooks(); 