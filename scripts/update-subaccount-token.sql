-- Update Twilio Phone Number with Subaccount Auth Token
-- Replace the values below with your actual data

UPDATE "twilio_phone_numbers"
SET 
  "subaccountAuthToken" = 'YOUR_SUBACCOUNT_AUTH_TOKEN_HERE',
  "subaccountSid" = 'YOUR_SUBACCOUNT_SID_HERE' -- Optional
WHERE 
  "phoneNumber" = '+17874764102';

-- Verify the update
SELECT 
  "phoneNumber",
  "subaccountSid",
  CASE 
    WHEN "subaccountAuthToken" IS NOT NULL THEN 'Set'
    ELSE 'Not Set'
  END as "hasSubaccountToken"
FROM "twilio_phone_numbers"
WHERE "phoneNumber" = '+17874764102'; 