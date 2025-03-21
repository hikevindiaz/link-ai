#!/bin/bash

echo "Creating conversationSummary table..."

# Load environment variables from .env file
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env file not found"
  exit 1
fi

# Create a SQL file to create the table
cat > prisma/create_summary_table.sql << EOL
-- Drop the table if it exists (to ensure a clean slate)
DROP TABLE IF EXISTS "conversationSummary";

-- Create the table with the correct structure
CREATE TABLE "conversationSummary" (
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

-- Verify the table was created
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversationSummary'
);
EOL

# Use POSTGRES_DIRECT_URL from the loaded environment variables
if [ -z "$POSTGRES_DIRECT_URL" ]; then
  echo "❌ POSTGRES_DIRECT_URL environment variable is not set in .env file"
  exit 1
fi

# Execute the SQL file
echo "Creating table in database..."
DATABASE_URL="$POSTGRES_DIRECT_URL" npx prisma db execute --file=prisma/create_summary_table.sql --schema=prisma/schema.prisma

# Check if the execution was successful
if [ $? -eq 0 ]; then
  echo "✅ Table created successfully!"
else
  echo "❌ Failed to create table"
  exit 1
fi

# Regenerate the Prisma client
echo "Regenerating Prisma client..."
npx prisma generate

# Check if the generation was successful
if [ $? -eq 0 ]; then
  echo "✅ Prisma client regenerated successfully!"
else
  echo "❌ Failed to regenerate Prisma client"
  exit 1
fi

echo "You may need to restart your development server for changes to take effect." 