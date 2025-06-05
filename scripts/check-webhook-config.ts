async function checkWebhookConfig() {
  console.log('📋 Webhook Configuration Guide for LinkAI\n');
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.getlinkai.com';
  
  console.log('🔧 Expected webhook URLs for ALL phone numbers:');
  console.log('================================================\n');
  
  console.log(`✅ Voice Webhook: ${appUrl}/api/twilio/voice`);
  console.log(`✅ SMS Webhook: ${appUrl}/api/twilio/webhook`);
  console.log(`✅ Method: POST`);
  console.log('\n⚠️  CRITICAL: Do NOT include ?agentId=xxx in the URLs!\n');
  
  console.log('📱 Based on your logs, update this phone number:');
  console.log('================================================\n');
  console.log('Phone Number: +17874764102');
  console.log('Current Issue: Webhook has wrong URL format or includes agentId parameter\n');
  
  console.log('🛠️  To fix webhooks in Twilio Console:');
  console.log('=====================================\n');
  console.log('1. Log into Twilio Console: https://console.twilio.com');
  console.log('2. Navigate to: Phone Numbers → Manage → Active Numbers');
  console.log('3. Click on +17874764102');
  console.log('4. Update Voice Configuration:');
  console.log(`   - A CALL COMES IN: Webhook`);
  console.log(`   - URL: ${appUrl}/api/twilio/voice`);
  console.log(`   - HTTP Method: POST`);
  console.log('5. Update Messaging Configuration (if using SMS):');
  console.log(`   - A MESSAGE COMES IN: Webhook`);
  console.log(`   - URL: ${appUrl}/api/twilio/webhook`);
  console.log(`   - HTTP Method: POST`);
  console.log('6. Click "Save Configuration"\n');
  
  console.log('🚀 How it works:');
  console.log('================\n');
  console.log('1. Call comes in to +17874764102');
  console.log('2. Twilio sends webhook to: ' + appUrl + '/api/twilio/voice');
  console.log('3. LinkAI looks up which agent owns +17874764102');
  console.log('4. Call is routed to the correct agent automatically');
  console.log('\nNo agentId needed in the URL - the system figures it out!\n');
  
  console.log('🔐 Security Note:');
  console.log('=================\n');
  console.log('If you temporarily disabled signature validation:');
  console.log('1. Remove TWILIO_SIGNATURE_VALIDATION=disabled from environment');
  console.log('2. Redeploy your application');
  console.log('\n✅ Once webhooks are updated, your calls will work!');
  
  // Check for database connection to show actual data if available
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  if (hasDatabaseUrl) {
    console.log('\n📊 To see actual phone numbers from your database:');
    console.log('Set DATABASE_URL environment variable and run again.');
  }
}

// Run the script
checkWebhookConfig(); 