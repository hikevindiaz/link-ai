/*
  Warnings:

  - You are about to drop the column `labels` on the `user_voices` table. All the data in the column will be lost.
  - You are about to drop the column `voiceId` on the `user_voices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,name]` on the table `user_voices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `openaiVoice` to the `user_voices` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "user_voices_userId_voiceId_key";

-- AlterTable
ALTER TABLE "user_voices" DROP COLUMN "labels",
DROP COLUMN "voiceId",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openaiVoice" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_voices_userId_name_key" ON "user_voices"("userId", "name");
