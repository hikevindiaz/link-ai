import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const fetchCountries = async () => {
  try {
    const availablePhoneNumbers = await client.availablePhoneNumbers.list({ limit: 20 });
    return availablePhoneNumbers.map((a) => ({
      code: a.countryCode,
      name: a.country,
      emoji: getCountryEmoji(a.countryCode), // You might need a function to map country codes to emojis
    }));
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
};

export const fetchAvailablePhoneNumbers = async (countryCode: string) => {
  try {
    const response = await client.availablePhoneNumbers(countryCode).local.list({ limit: 20 });
    return response.map((num) => num.phoneNumber);
  } catch (error) {
    console.error('Error fetching available phone numbers:', error);
    return [];
  }
};

export const fetchPhoneNumberPrice = async (phoneNumber: string) => {
  // Twilio does not provide a direct API for pricing individual numbers, so you might need to use a fixed price or another method.
  return 10; // Example fixed price
};

// Helper function to map country codes to emojis
const getCountryEmoji = (countryCode: string) => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}; 