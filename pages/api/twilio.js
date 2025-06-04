import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Check if credentials are configured
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        console.error('Missing Twilio credentials:', {
          TWILIO_ACCOUNT_SID: TWILIO_ACCOUNT_SID ? 'Set' : 'Missing',
          TWILIO_AUTH_TOKEN: TWILIO_AUTH_TOKEN ? 'Set' : 'Missing',
        });
        return res.status(500).json({ error: 'Twilio credentials not configured' });
      }

      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      const availablePhoneNumbers = await client.availablePhoneNumbers.countries.list();
      
      const countries = availablePhoneNumbers
        .map((a) => ({
          code: a.countryCode,
          name: a.country,
          emoji: getCountryEmoji(a.countryCode),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      res.status(200).json(countries);
    } catch (error) {
      console.error('Error fetching countries:', error);
      
      // Provide more specific error messages
      if (error.code === 20003) {
        return res.status(500).json({ error: 'Invalid Twilio credentials' });
      } else if (error.code === 20404) {
        return res.status(500).json({ error: 'Twilio resource not found' });
      } else {
        return res.status(500).json({ error: 'Failed to fetch countries from Twilio' });
      }
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Helper function to map country codes to emojis
const getCountryEmoji = (countryCode) => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}; 