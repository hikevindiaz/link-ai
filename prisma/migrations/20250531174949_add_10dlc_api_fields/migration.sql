/*
  Warnings:

  - You are about to drop the column `businessTasks` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `communicationChannels` on the `users` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "twilio_phone_numbers" ADD COLUMN     "messagingServiceSid" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "businessTasks",
DROP COLUMN "communicationChannels",
ADD COLUMN     "a2pBrandSid" TEXT,
ADD COLUMN     "a2pProfileBundleSid" TEXT,
ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessRegistrationNumber" TEXT,
ADD COLUMN     "companyType" TEXT,
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "trustHubProfileSid" TEXT,
ADD COLUMN     "twilioSubaccountAuthToken" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "country" SET DEFAULT 'US',
ALTER COLUMN "industryType" SET DEFAULT 'other';
