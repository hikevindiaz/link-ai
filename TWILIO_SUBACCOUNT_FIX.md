# Twilio Subaccount Auth Token Fix

## The Issue
Your phone number is in a Twilio **subaccount**, but your app is using the **main account's** auth token for signature validation. This causes validation to fail because:

- Twilio signs webhooks with the **subaccount's auth token**
- Your app validates with the **main account's auth token**
- Tokens don't match = validation fails

## Immediate Fix

### Step 1: Get Your Subaccount Auth Token
1. Log into [Twilio Console](https://console.twilio.com)
2. **Switch to the subaccount** that owns +17874764102
   - Use the dropdown in the top-left corner
   - Select the subaccount/project
3. Go to **Account → API keys & tokens**
4. Copy the **Auth Token** (starts with a long string)

### Step 2: Update Vercel Environment
1. Go to your Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Update `TWILIO_AUTH_TOKEN` with the **subaccount's auth token**
4. Save and redeploy

### Step 3: Test
Once deployed, calls should work immediately!

## Alternative: Use Main Account
If you don't need subaccounts:
1. Transfer the phone number to your main Twilio account
2. Continue using the main account auth token

## Permanent Solution (Future)
Add subaccount support to your database:

```prisma
model TwilioPhoneNumber {
  // ... existing fields ...
  
  subaccountSid         String?   
  subaccountAuthToken   String?   
  isSubaccount          Boolean   @default(false)
}
```

Then each phone number can have its own auth token for true multi-account support.

## Quick Debug
To confirm this is the issue:
1. Temporarily set `TWILIO_SIGNATURE_VALIDATION=disabled`
2. If calls work, it confirms it's an auth token mismatch
3. Update to the correct subaccount token
4. Remove the bypass 