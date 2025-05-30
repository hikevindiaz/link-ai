-- AlterTable
ALTER TABLE "twilio_phone_numbers" ADD COLUMN     "subscriptionItemId" TEXT;

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionItemId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_items_stripeSubscriptionItemId_key" ON "subscription_items"("stripeSubscriptionItemId");

-- AddForeignKey
ALTER TABLE "twilio_phone_numbers" ADD CONSTRAINT "twilio_phone_numbers_subscriptionItemId_fkey" FOREIGN KEY ("subscriptionItemId") REFERENCES "subscription_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
