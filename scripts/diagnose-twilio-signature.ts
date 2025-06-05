import twilio from 'twilio';

console.log('🔍 Twilio Signature Validation Diagnostic\n');

// Test data from your logs
const testData = {
  url: 'https://dashboard.getlinkai.com/api/twilio/voice',
  signature: 'YOUR_SIGNATURE_HERE', // You'll need to get this from Twilio logs
  authToken: process.env.TWILIO_AUTH_TOKEN || 'YOUR_AUTH_TOKEN',
  params: {
    Called: '+17874764102',
    ToState: 'Puerto Rico',
    CallerCountry: 'PR',
    Direction: 'inbound',
    CallerState: 'Puerto Rico',
    ToZip: '00966',
    CallSid: 'CAe0416b59901844a7626007cf41a4f3ef',
    To: '+17874764102',
    CallerZip: '00976',
    ToCountry: 'PR',
    StirVerstat: 'TN-Validation-Passed-A',
    CallToken: '%7B%22parentCallInfoToken%22%3A%22eyJhbGciOiJFUzI1NiJ9.eyJjYWxsU2lkIjoiQ0FlMDQxNmI1OTkwMTg0NGE3NjI2MDA3Y2Y0MWE0ZjNlZiIsImZyb20iOiIrMTc4NzM4MjU0ODEiLCJ0byI6IisxNzg3NDc2NDEwMiIsImlhdCI6IjE3NDkwODY1NDYifQ.t_EFeFXflFgbKuOcatjM3pjfNTelo0bh2kF__ilw2AvaBGc5Rg9_SogeR67HUqfmGm8xG7noLnQHNnoo4kUp5A%22%2C%22identityHeaderTokens%22%3A%5B%5D%7D',
    CalledZip: '00966',
    ApiVersion: '2010-04-01',
    CalledCity: 'GUAYNABO',
    CallStatus: 'ringing',
    From: '+17873825481',
    AccountSid: 'AC63991c2db51a41638adaa40c2fa6f205',
    CalledCountry: 'PR',
    CallerCity: 'TRUJILLO ALTO',
    ToCity: 'GUAYNABO',
    FromCountry: 'PR',
    Caller: '+17873825481',
    FromCity: 'TRUJILLO ALTO',
    CalledState: 'Puerto Rico',
    FromZip: '00976',
    FromState: 'Puerto Rico'
  }
};

console.log('Testing signature validation with different URL variations:\n');

// Test different URL variations
const urlVariations = [
  'https://dashboard.getlinkai.com/api/twilio/voice',
  'http://dashboard.getlinkai.com/api/twilio/voice',
  'https://dashboard.getlinkai.com/api/twilio/voice/',
  'https://www.dashboard.getlinkai.com/api/twilio/voice',
];

console.log('Auth Token Length:', testData.authToken.length);
console.log('Params Count:', Object.keys(testData.params).length);
console.log('\nIMPORTANT: The webhook URL in Twilio must match EXACTLY!\n');

// Show what URL to use in Twilio Console
console.log('📌 Configure this EXACT URL in Twilio Console:');
console.log('   https://dashboard.getlinkai.com/api/twilio/voice');
console.log('   (no trailing slash, no www, no query parameters)\n');

// Additional checks
console.log('🔍 Common Issues to Check:');
console.log('1. Trailing slash - Twilio and your app must match exactly');
console.log('2. Protocol (http vs https) - Must use https in production');
console.log('3. www subdomain - Don\'t use www unless your app URL has it');
console.log('4. Query parameters - Don\'t include any in the webhook URL');
console.log('5. Auth token - Make sure it matches your Twilio account\n');

console.log('📝 To fix:');
console.log('1. Log into Twilio Console');
console.log('2. Go to Phone Numbers → Active Numbers → +17874764102');
console.log('3. Set Voice webhook to exactly: https://dashboard.getlinkai.com/api/twilio/voice');
console.log('4. Save and test again'); 