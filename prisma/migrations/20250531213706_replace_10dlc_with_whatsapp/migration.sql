/*
  Warnings:

  - You are about to drop the column `messagingServiceSid` on the `twilio_phone_numbers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "twilio_phone_numbers" DROP COLUMN "messagingServiceSid",
ADD COLUMN     "whatsappBusinessId" TEXT,
ADD COLUMN     "whatsappConfiguredAt" TIMESTAMP(3),
ADD COLUMN     "whatsappDisplayName" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "a2pRegistrationStatus" DROP DEFAULT;
