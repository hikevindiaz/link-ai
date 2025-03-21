#!/bin/bash

echo "Checking database tables..."

# Load environment variables from .env file
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env file not found"
  exit 1
fi

# Create a SQL file to check tables
cat > prisma/check_tables.sql << EOL
-- List all tables in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check if conversationSummary table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversationSummary'
);

-- Check if ConversationSummary table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ConversationSummary'
);

-- If conversationSummary exists, show its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'conversationSummary';

-- If ConversationSummary exists, show its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'ConversationSummary';
EOL

# Use POSTGRES_DIRECT_URL from the loaded environment variables
if [ -z "$POSTGRES_DIRECT_URL" ]; then
  echo "❌ POSTGRES_DIRECT_URL environment variable is not set in .env file"
  exit 1
fi

# Execute the SQL file
echo "Querying database structure..."
DATABASE_URL="$POSTGRES_DIRECT_URL" npx prisma db execute --file=prisma/check_tables.sql --schema=prisma/schema.prisma

# Check if the execution was successful
if [ $? -eq 0 ]; then
  echo "✅ Database structure check completed!"
else
  echo "❌ Failed to check database structure"
  exit 1
fi 