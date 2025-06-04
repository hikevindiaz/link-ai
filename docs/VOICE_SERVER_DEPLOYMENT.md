# Voice Server Deployment Guide

## Overview

The voice server is a separate WebSocket service deployed on Fly.io that handles real-time voice conversations by bridging Twilio Media Streams with OpenAI's Realtime API.

## Architecture

- **Main Application**: Deployed on Vercel, handles all business logic and database operations
- **Voice Server**: Deployed on Fly.io, handles WebSocket connections for voice calls
- **Database**: Supabase PostgreSQL (accessed only by main app)

## Voice Server Features

- Minimal Node.js server with WebSocket support
- Receives configuration via URL parameters (no database access)
- Bridges Twilio Media Streams to OpenAI Realtime API
- Handles bidirectional audio streaming

## Deployment Steps

### 1. Install Fly CLI
```bash
brew install flyctl
```

### 2. Authenticate
```bash
flyctl auth login
```

### 3. Deploy
From the `voice-server` directory:
```bash
flyctl deploy
```

### 4. Monitor
```bash
# View logs
flyctl logs

# Check status
flyctl status

# View app info
flyctl info
```

## Configuration

### Main App Environment Variables
Add to your `.env` file:
```
VOICE_SERVER_URL=wss://voice-server.fly.dev
```

### Voice Server Secrets
Set on Fly.io:
```bash
flyctl secrets set ALLOWED_ORIGINS="https://dashboard.getlinkai.com,https://localhost:3000"
```

## How It Works

1. **Incoming Call**: Twilio sends webhook to main app's `/api/twilio/voice`
2. **Agent Lookup**: Main app queries database for agent configuration
3. **Stream Setup**: Main app responds with TwiML connecting to voice server
4. **Configuration Pass**: Agent config passed via URL parameters:
   - `agentId`: Agent identifier
   - `openAIKey`: OpenAI API key
   - `prompt`: System prompt
   - `voice`: Voice selection (e.g., "alloy")
   - `temperature`: AI temperature setting
5. **Audio Bridge**: Voice server creates bidirectional audio stream between Twilio and OpenAI

## Testing

### Health Check
```bash
curl https://voice-server.fly.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "voice-server",
  "timestamp": "2025-06-04T23:19:45.408Z"
}
```

### WebSocket Endpoint
- URL: `wss://voice-server.fly.dev/api/twilio/media-stream`
- Requires valid query parameters

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check ALLOWED_ORIGINS includes your domain
   - Verify VOICE_SERVER_URL in main app

2. **Agent Not Found**
   - Ensure agent exists in database
   - Check phone number is assigned to agent

3. **No Audio**
   - Verify OpenAI API key is valid
   - Check Twilio phone number configuration

### Useful Commands
```bash
# SSH into the machine
flyctl ssh console

# View real-time logs
flyctl logs

# Restart the app
flyctl restart

# Scale the app
flyctl scale count 2  # Add more instances
```

## Production Considerations

1. **Scaling**: Voice server can be scaled horizontally
2. **Monitoring**: Set up alerts for health check failures
3. **Security**: Keep API keys secure, use URL parameters carefully
4. **Cost**: Monitor Fly.io usage and OpenAI API costs 