#!/usr/bin/env node

const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const webhookUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/twilio/webhook/10dlc-status';

if (!accountSid || !authToken) {
  console.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variables');
  process.exit(1);
}

if (!webhookUrl) {
  console.error('Missing NEXT_PUBLIC_APP_URL environment variable');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function setupEventStreams() {
  try {
    console.log('Setting up Twilio Event Streams for 10DLC monitoring...');
    console.log('Webhook URL:', webhookUrl);
    
    // Step 1: Create a Sink (webhook destination)
    console.log('\n1. Creating webhook sink...');
    const sink = await client.events.v1.sinks.create({
      description: 'LinkAI 10DLC Registration Events',
      sinkConfiguration: {
        destination: webhookUrl,
        method: 'POST',
        batch_events: true
      },
      sinkType: 'webhook'
    });
    
    console.log('✓ Sink created:', sink.sid);
    
    // Step 2: Create a Subscription for 10DLC events
    console.log('\n2. Creating event subscription...');
    
    const eventTypes = [
      // Brand events
      'com.twilio.messaging.compliance.brand-registration.brand-registered',
      'com.twilio.messaging.compliance.brand-registration.brand-failure',
      'com.twilio.messaging.compliance.brand-registration.brand-verified',
      'com.twilio.messaging.compliance.brand-registration.brand-unverified',
      'com.twilio.messaging.compliance.brand-registration.brand-vetted-verified',
      'com.twilio.messaging.compliance.brand-registration.brand-secondary-vetting-failure',
      
      // Campaign events
      'com.twilio.messaging.compliance.campaign-registration.campaign-submitted',
      'com.twilio.messaging.compliance.campaign-registration.campaign-failure',
      'com.twilio.messaging.compliance.campaign-registration.campaign-approved',
      
      // Phone number events
      'com.twilio.messaging.compliance.number-deregistration.failed',
      'com.twilio.messaging.compliance.number-deregistration.pending',
      'com.twilio.messaging.compliance.number-deregistration.successful',
      'com.twilio.messaging.compliance.number-registration.failed',
      'com.twilio.messaging.compliance.number-registration.pending',
      'com.twilio.messaging.compliance.number-registration.successful'
    ];
    
    const subscription = await client.events.v1.subscriptions.create({
      description: 'LinkAI 10DLC Registration Events Subscription',
      sinkSid: sink.sid,
      types: eventTypes.map(type => ({ type }))
    });
    
    console.log('✓ Subscription created:', subscription.sid);
    
    // Step 3: Test the sink
    console.log('\n3. Testing webhook sink...');
    try {
      await client.events.v1.sinks(sink.sid).sinkTest.create({});
      console.log('✓ Test event sent to webhook');
    } catch (error) {
      console.log('⚠ Test failed:', error.message);
    }
    
    console.log('\n✅ Event Streams setup complete!');
    console.log('\nEvent monitoring is now active for:');
    console.log('- Brand registration status changes');
    console.log('- Campaign registration status changes');
    console.log('- Phone number registration status changes');
    
    console.log('\n📋 Configuration details:');
    console.log('Sink SID:', sink.sid);
    console.log('Subscription SID:', subscription.sid);
    console.log('Webhook URL:', webhookUrl);
    
    console.log('\n💡 To view or modify these settings, visit:');
    console.log('https://console.twilio.com/us1/monitor/events/sinks');
    
  } catch (error) {
    console.error('\n❌ Error setting up Event Streams:', error.message);
    
    if (error.code === 20409) {
      console.log('\n💡 It looks like Event Streams might already be configured.');
      console.log('To view existing configurations, visit:');
      console.log('https://console.twilio.com/us1/monitor/events/sinks');
    }
    
    process.exit(1);
  }
}

// Run the setup
setupEventStreams(); 