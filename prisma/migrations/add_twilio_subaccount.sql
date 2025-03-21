-- Add twilioSubaccountSid field to User table
ALTER TABLE "User" ADD COLUMN "twilio_subaccount_sid" TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "User_twilio_subaccount_sid_idx" ON "User"("twilio_subaccount_sid"); 