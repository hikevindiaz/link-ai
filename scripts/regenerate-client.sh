#!/bin/bash

echo "Regenerating Prisma client..."

# Generate Prisma client
npx prisma generate

# Check if the generation was successful
if [ $? -eq 0 ]; then
  echo "✅ Prisma client regenerated successfully!"
else
  echo "❌ Failed to regenerate Prisma client"
  exit 1
fi

echo "You may need to restart your development server for changes to take effect."