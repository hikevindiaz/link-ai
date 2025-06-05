# Twilio Webhook Troubleshooting Guide

## Common Issue: Signature Validation Failure (403 Error)

If you're seeing "Unauthorized request" errors when Twilio tries to call your webhooks, it's likely due to signature validation failure.

### Symptoms
- 403 error in Twilio console
- Error message: "Unauthorized request" 
- Logs show: "[Twilio Validation] All validation attempts failed"

### Root Causes

1. **Webhook URL Mismatch**: The URL configured in Twilio doesn't match what the server expects
2. **Incorrect URL Format**: The webhook URL should NOT include query parameters like `agentId`
3. **Wrong Auth Token**: Using incorrect auth token for validation (especially with subaccounts)
4. **Protocol Mismatch**: HTTP vs HTTPS discrepancy

### Solutions

#### 1. Run Webhook Fix Script
First, verify and fix all webhook configurations:

```bash
npm run fix-twilio-webhooks
```

This script will:
- Check all phone numbers in your database
- Verify their webhook configurations in Twilio
- Automatically fix any misconfigurations

#### 2. Temporary Bypass (For Testing Only!)
If you need to test immediately, you can temporarily disable signature validation:

1. Add to your environment variables:
```env
TWILIO_SIGNATURE_VALIDATION=disabled
```

2. Deploy the changes

⚠️ **WARNING**: Only use this for debugging! Re-enable validation once webhooks are fixed.

#### 3. Manual Webhook Configuration
If automatic configuration fails, manually set webhooks in Twilio Console:

1. Go to Phone Numbers > Manage > Active Numbers
2. Click on your phone number
3. Set the Voice webhook to:
   ```
   https://your-domain.com/api/twilio/voice
   ```
   **Note**: Do NOT include `agentId` in the URL. The system automatically looks up the agent based on the phone number.
4. Set method to POST
5. Save

### Debugging Steps

1. **Check Current Webhook Configuration**:
   - Run `npm run fix-twilio-webhooks` to see current configuration
   - Note any URL mismatches

2. **Verify Environment Variables**:
   ```bash
   echo $TWILIO_ACCOUNT_SID
   echo $TWILIO_AUTH_TOKEN
   echo $NEXT_PUBLIC_APP_URL
   ```

3. **Check Logs**:
   Look for these log entries:
   - `[Twilio Validation] Starting validation`
   - `[Twilio Validation] Trying URL variations`
   - `[Twilio Validation] Validation succeeded with URL`

4. **Test with ngrok** (for local development):
   ```bash
   ngrok http 3000
   ```
   Then update Twilio webhook to use ngrok URL.

### Production Checklist

Before going to production:
- [ ] Ensure `TWILIO_SIGNATURE_VALIDATION` is NOT set to 'disabled'
- [ ] All phone numbers have correct webhook URLs (without query parameters)
- [ ] HTTPS is enforced on all webhook URLs
- [ ] Auth tokens match between application and Twilio account
- [ ] Run `npm run fix-twilio-webhooks` to verify configuration

### Scalable Architecture

The system is designed to support multiple Twilio accounts/subaccounts:
- **No agentId in URLs**: Webhooks don't include agent IDs in the URL
- **Phone Number Lookup**: The system looks up which agent owns a phone number based on the "To" field
- **Subaccount Support**: Each phone number can have its own auth token (future feature)
- **Multiple Numbers per Agent**: One agent can have multiple phone numbers from different Twilio accounts

### Voice Server Integration

The voice webhook connects to the voice server for real-time conversation:
- Voice Server URL: Set via `VOICE_SERVER_URL` env variable
- Default: `wss://voice-server.fly.dev`
- The webhook passes agent configuration to the voice server via query parameters

### Related Files
- `/app/api/twilio/voice/route.ts` - Main voice webhook handler
- `/lib/twilio/webhook-manager.ts` - Webhook configuration manager
- `/scripts/fix-twilio-webhooks.ts` - Webhook verification/fix script 