-- Rename the table if it exists with the old name
ALTER TABLE IF EXISTS "ConversationSummary" RENAME TO "conversationSummary";

-- If the table doesn't exist at all, we'll create it
CREATE TABLE IF NOT EXISTS "conversationSummary" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  
  CONSTRAINT "conversationSummary_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversationSummary_threadId_key" UNIQUE ("threadId"),
  CONSTRAINT "conversationSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
