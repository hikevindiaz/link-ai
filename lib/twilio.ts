import * as Twilio from 'twilio';

// Initialize Twilio client
export const twilio = Twilio.default(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

// Helper to get the base URL for Twilio webhooks based on the environment
export const getTwilioWebhookBaseUrl = (forceProduction = false): string => {
  if (process.env.NODE_ENV === 'production' || forceProduction) {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.getlinkai.com';
  }
  
  // For testing in development, use example.com to avoid Twilio trying to reach localhost
  return 'https://example.com';
};

// Get webhook URLs for Twilio
export const getTwilioWebhookUrls = (forceProduction = false) => {
  const baseUrl = getTwilioWebhookBaseUrl(forceProduction);
  
  return {
    smsUrl: `${baseUrl}/api/twilio/sms`,
    voiceUrl: `${baseUrl}/api/twilio/voice`
  };
}; 