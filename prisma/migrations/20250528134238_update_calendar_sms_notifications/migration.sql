/*
  Warnings:

  - You are about to drop the column `emailReminderEnabled` on the `calendars` table. All the data in the column will be lost.
  - You are about to drop the column `notificationEmail` on the `calendars` table. All the data in the column will be lost.
  - You are about to drop the column `notificationEmailEnabled` on the `calendars` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "calendars" DROP COLUMN "emailReminderEnabled",
DROP COLUMN "notificationEmail",
DROP COLUMN "notificationEmailEnabled",
ADD COLUMN     "confirmationRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "confirmationTimeoutHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "notificationSmsEnabled" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "smsReminderEnabled" SET DEFAULT true;
