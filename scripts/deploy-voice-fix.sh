#!/bin/bash

echo "🚀 Deploying voice configuration fixes..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Deploy main app to Vercel
echo -e "${YELLOW}📦 Deploying main app to Vercel...${NC}"
git add .
git commit -m "fix: voice configuration mapping and call config storage"
git push origin main

echo -e "${GREEN}✅ Main app deployed to Vercel${NC}"
echo "Vercel will automatically deploy from the GitHub push"

# Deploy voice server to Fly.io
echo -e "${YELLOW}🎤 Deploying voice server to Fly.io...${NC}"
cd voice-server
fly deploy --app voice-server

echo -e "${GREEN}✅ Voice server deployed to Fly.io${NC}"

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test a voice call to verify the fix"
echo "2. Monitor logs with: fly logs -a voice-server"
echo "3. Check Vercel deployment status at https://vercel.com/dashboard" 