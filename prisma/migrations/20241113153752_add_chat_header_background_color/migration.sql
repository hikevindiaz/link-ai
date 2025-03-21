-- AlterTable
ALTER TABLE "chatbots" ADD COLUMN     "chatBackgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
ALTER COLUMN "chatTitle" SET DEFAULT '2',
ALTER COLUMN "chatHeaderBackgroundColor" SET DEFAULT 'FFFFFF';
