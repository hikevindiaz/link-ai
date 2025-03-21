import { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { accountSid, authToken } = req.body;

  if (!accountSid || !authToken) {
    return res.status(400).json({ success: false, message: "Missing Twilio credentials." });
  }

  try {
    const client = twilio(accountSid, authToken);

    // Test credentials by fetching account details
    const account = await client.api.accounts(accountSid).fetch();

    if (account) {
      return res.status(200).json({ success: true, message: "Twilio credentials are valid." });
    }

    return res.status(400).json({ success: false, message: "Invalid Twilio credentials." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to validate Twilio credentials." });
  }
}
