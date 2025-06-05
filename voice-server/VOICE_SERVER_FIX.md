# Voice Server WebSocket Fix

## Issue
Twilio WebSocket connections were being rejected because:
- Voice server was checking origin headers for all WebSocket connections
- Twilio doesn't send origin headers when connecting to WebSockets
- This caused "31920 Stream - WebSocket - Handshake Error"

## Fix Applied
Updated `server.js` to:
1. Skip origin validation for `/api/twilio/media-stream` endpoint
2. Add better logging for debugging WebSocket connections
3. Log user-agent and other headers from Twilio

## Deploy the Fix

```bash
cd voice-server
git add .
git commit -m "Fix: Allow Twilio WebSocket connections without origin header"
git push origin main

# Deploy to Fly.io
fly deploy
```

## Verify the Fix
After deployment:
1. Call your phone number
2. Check voice server logs: `fly logs -a voice-server`
3. You should see:
   - "WebSocket upgrade request: /api/twilio/media-stream"
   - "Handling WebSocket connection for agent: ..."
   - No more handshake errors

## What Changed
- Origin validation is now skipped for Twilio media stream endpoint
- Added logging to track WebSocket connection attempts
- Preserved security for other WebSocket endpoints

## Important Note
The voice server needs to accept WebSocket connections from Twilio's infrastructure, which doesn't send standard browser headers like 'origin'. This is expected behavior for server-to-server WebSocket connections. 