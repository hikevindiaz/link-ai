import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { country } = req.query;
    try {
      const pricing = await client.pricing.v1.phoneNumbers.countries(country).fetch();
      res.status(200).json({
        country: pricing.country,
        iso_country: pricing.isoCountry,
        phone_number_prices: pricing.phoneNumberPrices,
        price_unit: pricing.priceUnit,
      });
    } catch (error) {
      console.error('Error fetching pricing:', error);
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
