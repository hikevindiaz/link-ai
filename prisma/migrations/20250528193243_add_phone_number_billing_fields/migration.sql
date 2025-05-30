-- AlterTable
ALTER TABLE "twilio_phone_numbers" ADD COLUMN     "billingFailedDate" TIMESTAMP(3),
ADD COLUMN     "lastBilledDate" TIMESTAMP(3),
ADD COLUMN     "nextBillingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "unpaidBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "warningsSent" INTEGER NOT NULL DEFAULT 0;
