-- Add read field to messages table with default value of false
ALTER TABLE "messages" ADD COLUMN "read" BOOLEAN NOT NULL DEFAULT false; 