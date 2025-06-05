# Twilio Webhook Fix - Deployment Guide

## Quick Fix for Current Issue

Your Twilio webhooks are failing because they're configured with the wrong URL format. Here's how to fix it:

### Option 1: Automatic Fix (Recommended)

1. **Run the fix script locally with production credentials:**
   ```bash
   # Set production environment variables
   export TWILIO_ACCOUNT_SID=your_production_sid
   export TWILIO_AUTH_TOKEN=your_production_auth_token
   export NEXT_PUBLIC_APP_URL=https://dashboard.getlinkai.com
   export DATABASE_URL=your_production_database_url
   
   # Run the fix script
   npm run fix-twilio-webhooks
   ```

2. **Deploy the updated code:**
   ```bash
   git add .
   git commit -m "Fix: Update Twilio webhook configuration for scalable architecture"
   git push origin main
   ```

### Option 2: Manual Fix in Twilio Console

1. **Log into Twilio Console**
2. **Navigate to:** Phone Numbers → Manage → Active Numbers
3. **For each phone number (+17874764102):**
   - Click on the number
   - Update Voice Configuration:
     - **Webhook URL:** `https://dashboard.getlinkai.com/api/twilio/voice`
     - **Method:** POST
     - **Remove any query parameters** (no ?agentId=...)
   - Save changes

### Option 3: Temporary Bypass (Emergency Only!)

If you need calls working immediately:

1. **Add to Vercel Environment Variables:**
   ```
   TWILIO_SIGNATURE_VALIDATION=disabled
   ```

2. **Redeploy**

⚠️ **WARNING:** This disables security. Only use temporarily!

## What Changed?

The system now uses a scalable architecture where:
- ❌ **OLD:** `https://dashboard.getlinkai.com/api/twilio/voice?agentId=xxx`
- ✅ **NEW:** `https://dashboard.getlinkai.com/api/twilio/voice`

The webhook automatically looks up which agent owns the phone number.

## Verification

After deployment, test a call:
1. Call your phone number (+17874764102)
2. Check logs for successful webhook processing
3. Verify the agent responds correctly

## Next Steps

1. **Remove temporary bypass** (if used)
2. **Run webhook fix script** to ensure all numbers are configured correctly
3. **Monitor logs** for any remaining issues

## Support

If issues persist:
1. Check `/docs/TWILIO_WEBHOOK_TROUBLESHOOTING.md`
2. Review `/docs/TWILIO_SCALABLE_ARCHITECTURE.md`
3. Check webhook validation logs in production 