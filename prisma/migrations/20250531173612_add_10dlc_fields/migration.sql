/*
  Warnings:

  - You are about to drop the column `billingFailedDate` on the `twilio_phone_numbers` table. All the data in the column will be lost.
  - You are about to drop the column `lastBilledDate` on the `twilio_phone_numbers` table. All the data in the column will be lost.
  - You are about to drop the column `nextBillingDate` on the `twilio_phone_numbers` table. All the data in the column will be lost.
  - You are about to drop the column `unpaidBalance` on the `twilio_phone_numbers` table. All the data in the column will be lost.
  - You are about to drop the column `warningsSent` on the `twilio_phone_numbers` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "OpenAIConfig" DROP CONSTRAINT "OpenAIConfig_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_bookedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "calendars" DROP CONSTRAINT "calendars_userId_fkey";

-- DropForeignKey
ALTER TABLE "chatbots" DROP CONSTRAINT "chatbots_userId_fkey";

-- DropForeignKey
ALTER TABLE "conversationSummary" DROP CONSTRAINT "conversationSummary_userId_fkey";

-- DropForeignKey
ALTER TABLE "crawlers" DROP CONSTRAINT "crawlers_userId_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_userId_fkey";

-- DropForeignKey
ALTER TABLE "forms" DROP CONSTRAINT "forms_userId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_userId_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_sources" DROP CONSTRAINT "knowledge_sources_userId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_userId_fkey";

-- DropForeignKey
ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_userId_fkey";

-- DropForeignKey
ALTER TABLE "subscription_items" DROP CONSTRAINT "subscription_items_userId_fkey";

-- DropForeignKey
ALTER TABLE "twilio_phone_numbers" DROP CONSTRAINT "twilio_phone_numbers_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_integration_settings" DROP CONSTRAINT "user_integration_settings_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_voices" DROP CONSTRAINT "user_voices_userId_fkey";

-- AlterTable
ALTER TABLE "twilio_phone_numbers" DROP COLUMN "billingFailedDate",
DROP COLUMN "lastBilledDate",
DROP COLUMN "nextBillingDate",
DROP COLUMN "unpaidBalance",
DROP COLUMN "warningsSent",
ADD COLUMN     "a2pBrandSid" TEXT,
ADD COLUMN     "a2pCampaignSid" TEXT,
ADD COLUMN     "a2pRegisteredAt" TIMESTAMP(3),
ADD COLUMN     "a2pRegistrationError" TEXT,
ADD COLUMN     "a2pRegistrationStatus" TEXT DEFAULT 'not_started',
ALTER COLUMN "status" SET DEFAULT 'pending';

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inquiryEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "stripeSubscriptionStatus" TEXT,
    "stripe_current_period_end" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "stripe_price_id" TEXT,
    "stripe_subscription_id" TEXT,
    "twilio_subaccount_sid" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "businessTasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessWebsite" TEXT,
    "city" TEXT,
    "communicationChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "companyName" TEXT,
    "companySize" TEXT,
    "country" TEXT,
    "industryType" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "postalCode" TEXT,
    "state" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twilio_a2p_brands" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "twilioAccountSid" TEXT NOT NULL,
    "brandSid" TEXT NOT NULL,
    "brandStatus" TEXT NOT NULL,
    "brandType" TEXT NOT NULL DEFAULT 'standard',
    "companyName" TEXT NOT NULL,
    "businessWebsite" TEXT,
    "entityType" TEXT NOT NULL DEFAULT 'private_for_profit',
    "registrationReason" TEXT NOT NULL DEFAULT 'marketing',
    "vertical" TEXT NOT NULL,
    "ein" TEXT,
    "address" JSONB NOT NULL,
    "contactInfo" JSONB NOT NULL,
    "registrationData" JSONB,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twilio_a2p_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twilio_a2p_campaigns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "twilioAccountSid" TEXT NOT NULL,
    "campaignSid" TEXT NOT NULL,
    "campaignStatus" TEXT NOT NULL,
    "useCaseCategory" TEXT NOT NULL DEFAULT 'mixed',
    "description" TEXT NOT NULL,
    "messageFlow" TEXT NOT NULL,
    "helpMessage" TEXT NOT NULL,
    "optInMessage" TEXT NOT NULL,
    "sampleMessages" JSONB NOT NULL,
    "registrationData" JSONB,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twilio_a2p_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_twilio_subaccount_sid_key" ON "users"("twilio_subaccount_sid");

-- CreateIndex
CREATE INDEX "usage_records_userId_billingPeriodStart_billingPeriodEnd_idx" ON "usage_records"("userId", "billingPeriodStart", "billingPeriodEnd");

-- CreateIndex
CREATE INDEX "usage_records_userId_usageType_billingPeriodStart_idx" ON "usage_records"("userId", "usageType", "billingPeriodStart");

-- CreateIndex
CREATE INDEX "usage_records_createdAt_idx" ON "usage_records"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_a2p_brands_userId_key" ON "twilio_a2p_brands"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_a2p_brands_brandSid_key" ON "twilio_a2p_brands"("brandSid");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_a2p_campaigns_campaignSid_key" ON "twilio_a2p_campaigns"("campaignSid");

-- AddForeignKey
ALTER TABLE "OpenAIConfig" ADD CONSTRAINT "OpenAIConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversationSummary" ADD CONSTRAINT "conversationSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawlers" ADD CONSTRAINT "crawlers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twilio_phone_numbers" ADD CONSTRAINT "twilio_phone_numbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_voices" ADD CONSTRAINT "user_voices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_bookedByUserId_fkey" FOREIGN KEY ("bookedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_integration_settings" ADD CONSTRAINT "user_integration_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twilio_a2p_brands" ADD CONSTRAINT "twilio_a2p_brands_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twilio_a2p_campaigns" ADD CONSTRAINT "twilio_a2p_campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twilio_a2p_campaigns" ADD CONSTRAINT "twilio_a2p_campaigns_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "twilio_a2p_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
