#!/bin/bash

# Apply Prisma migrations
echo "Applying Prisma migrations..."
npx prisma migrate dev --name add_conversation_summary

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

echo "Migrations applied successfully!" 