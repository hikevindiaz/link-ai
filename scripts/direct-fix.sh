#!/bin/bash

echo "Applying direct fix for conversation summaries..."

# Create a migration file
mkdir -p prisma/migrations/direct_fix
cat > prisma/migrations/direct_fix/migration.sql << EOL
-- CreateTable
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
EOL

# Apply the migration directly using prisma migrate
echo "Applying migration..."
npx prisma migrate resolve --applied direct_fix

# Regenerate the Prisma client
echo "Regenerating Prisma client..."
npx prisma generate

echo "Restarting the development server is recommended for changes to take effect."