-- AlterTable
ALTER TABLE "calendars" ADD COLUMN     "emailReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationEmailEnabled" BOOLEAN NOT NULL DEFAULT true;
