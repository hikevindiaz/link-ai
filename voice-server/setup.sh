#!/bin/bash

# Link AI Voice Server Setup Script
# This script helps set up and deploy the voice server

echo "🚀 Link AI Voice Server Setup"
echo "============================"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

# Check if fly is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed."
    echo "Install it with: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env with your configuration before proceeding."
    echo "Press enter when ready..."
    read
fi

# Source .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Test database connection
echo "🔍 Testing database connection..."
node -e "
const prisma = require('./lib/prisma');
prisma.chatbot.findFirst()
  .then(() => console.log('✅ Database connection successful'))
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.\$disconnect());
" || exit 1

# Local test option
echo ""
echo "Would you like to test locally first? (y/n)"
read -r LOCAL_TEST

if [ "$LOCAL_TEST" = "y" ]; then
    echo "🏃 Starting local server..."
    echo "Press Ctrl+C to stop and continue with deployment"
    npm run dev
fi

# Deploy to Fly.io
echo ""
echo "Ready to deploy to Fly.io? (y/n)"
read -r DEPLOY_CONFIRM

if [ "$DEPLOY_CONFIRM" != "y" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Check if app exists
if fly status &> /dev/null; then
    echo "✅ Fly app already exists"
else
    echo "📱 Creating new Fly app..."
    fly launch --no-deploy
fi

# Set secrets
echo "🔐 Setting environment secrets..."

# Database URL
if [ -n "$DATABASE_URL" ]; then
    fly secrets set DATABASE_URL="$DATABASE_URL"
else
    echo "⚠️  No DATABASE_URL found in .env"
    echo "Enter your database URL:"
    read -r DB_URL
    fly secrets set DATABASE_URL="$DB_URL"
fi

# Allowed origins
if [ -n "$ALLOWED_ORIGINS" ]; then
    fly secrets set ALLOWED_ORIGINS="$ALLOWED_ORIGINS"
else
    fly secrets set ALLOWED_ORIGINS="https://dashboard.getlinkai.com,https://app.getlinkai.com"
fi

# Optional: Main app URL
if [ -n "$MAIN_APP_URL" ]; then
    fly secrets set MAIN_APP_URL="$MAIN_APP_URL"
fi

# Optional: Internal API key
if [ -n "$INTERNAL_API_KEY" ]; then
    fly secrets set INTERNAL_API_KEY="$INTERNAL_API_KEY"
fi

# Deploy
echo "🚀 Deploying to Fly.io..."
fly deploy

# Check deployment
echo ""
echo "🔍 Checking deployment status..."
fly status

# Get app URL
APP_URL=$(fly info -j | jq -r '.app.hostname')
echo ""
echo "✅ Deployment complete!"
echo "📍 Voice server URL: wss://$APP_URL"
echo ""
echo "Next steps:"
echo "1. Update VOICE_SERVER_URL in your main app to: wss://$APP_URL"
echo "2. Test the health endpoint: https://$APP_URL/health"
echo "3. Monitor logs: fly logs --tail"
echo ""
echo "�� Setup complete!" 