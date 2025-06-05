# Twilio Signature Validation Debug Guide

## Current Issue
After removing `TWILIO_SIGNATURE_VALIDATION=disabled`, calls are failing with 403 errors again.

## Quick Fix Options

### Option 1: Check Exact Webhook URL in Twilio
The most common cause is URL mismatch. Check your Twilio Console:

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to Phone Numbers → Active Numbers
3. Click on +17874764102
4. Check the Voice webhook URL - it must be EXACTLY:
   ```
   https://dashboard.getlinkai.com/api/twilio/voice
   ```
   
   Common mistakes:
   - ❌ `https://dashboard.getlinkai.com/api/twilio/voice/` (trailing slash)
   - ❌ `http://dashboard.getlinkai.com/api/twilio/voice` (http instead of https)
   - ❌ `https://www.dashboard.getlinkai.com/api/twilio/voice` (www subdomain)
   - ❌ `https://dashboard.getlinkai.com/api/twilio/voice?agentId=xxx` (query params)

### Option 2: Verify Auth Token
Make sure your Vercel environment variable `TWILIO_AUTH_TOKEN` matches your Twilio account:

1. In Twilio Console, go to Account → API keys & tokens
2. Copy your Auth Token (not API Key)
3. In Vercel Dashboard, update `TWILIO_AUTH_TOKEN` with this exact value

### Option 3: Deploy Enhanced Debugging
I've added more debugging to help identify the issue:

```bash
git add .
git commit -m "Add enhanced Twilio signature validation debugging"
git push origin main
```

After deployment, try calling again and check the logs for:
- "Base URL from env:" - Shows what URL the server expects
- "Testing URL:" - Shows each URL being tested
- "Signature preview:" - Shows first 10 chars of signature

### Option 4: Temporary Re-enable Bypass
If you need calls working immediately while debugging:

1. Re-add to Vercel: `TWILIO_SIGNATURE_VALIDATION=disabled`
2. Keep investigating the root cause
3. Remove once fixed

## Most Likely Cause
Based on experience, 90% of the time it's because the webhook URL in Twilio has:
- A trailing slash
- Wrong protocol (http vs https)
- Query parameters
- Or doesn't match exactly what's in `NEXT_PUBLIC_APP_URL`

## Next Steps
1. Double-check the webhook URL in Twilio Console
2. Deploy the enhanced debugging
3. Make a test call and share the new logs
4. We'll identify the exact mismatch 