#!/bin/bash

echo "Applying simple fix for conversation summaries..."

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

echo "Restarting the development server is recommended for changes to take effect."
echo "If this doesn't fix the issue, try running the fix-summary-table.sh script." 