import * as Twilio from 'twilio';

// Initialize Twilio client
export const twilio = Twilio.default(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
); 