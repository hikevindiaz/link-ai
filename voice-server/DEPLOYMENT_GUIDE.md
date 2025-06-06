# Voice Server Deployment Guide

This guide covers deploying the Link AI Voice Server to Fly.io with full database connectivity.

## Prerequisites

- Fly CLI installed and authenticated
- Access to your production database
- Node.js 18+ installed locally

## Initial Setup

1. **Install dependencies and generate Prisma client:**
```bash
   cd voice-server
   npm install
   npx prisma generate
```

2. **Configure environment variables:**
   Create a `.env` file based on `env.example`:
```bash
   cp env.example .env
   # Edit .env with your actual values
```

3. **Test locally:**
```bash
   npm run dev
```

## Deploy to Fly.io

1. **Launch new app (first time only):**
```bash
   fly launch
   ```
   - Choose app name: `linkai-voice-server`
   - Select region closest to your users
   - Don't deploy yet when prompted

2. **Set secrets (environment variables):**
   ```bash
   # Database connection (use your main app's database)
   fly secrets set DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
   
   # Allowed origins
   fly secrets set ALLOWED_ORIGINS="https://dashboard.getlinkai.com,https://app.getlinkai.com"
   
   # Optional: Main app URL for API callbacks
   fly secrets set MAIN_APP_URL="https://dashboard.getlinkai.com"
   
   # Optional: Internal API key
   fly secrets set INTERNAL_API_KEY="your-secure-key-here"
   ```

3. **Configure fly.toml:**
   The fly.toml file should already be configured, but verify it includes:
   - Internal port 3000
   - Health check endpoint
   - Proper scaling settings

4. **Deploy:**
```bash
   fly deploy
```

5. **Verify deployment:**
   ```bash
   # Check app status
   fly status
   
   # Check logs
   fly logs
   
   # Test health endpoint
   curl https://linkai-voice-server.fly.dev/health
   ```

## Update Main App Configuration

1. **Set voice server URL in main app:**
```bash
   # In your main app directory
   VOICE_SERVER_URL=wss://linkai-voice-server.fly.dev
   ```

2. **Deploy main app changes:**
```bash
   git add .
   git commit -m "Update voice server URL"
   git push origin main
```

## Database Considerations

The voice server now connects directly to your production database to retrieve agent configurations. This approach:

- **Pros:**
  - Full access to agent configuration
  - Supports all agent features (tools, knowledge sources, voice settings)
  - No URL length limitations
  - More secure than passing config through URLs

- **Cons:**
  - Requires database connection from voice server
  - Slightly higher latency for initial connection

### Database Connection Pooling

The voice server uses Prisma's connection pooling by default. For production, consider:

1. Setting connection pool size in DATABASE_URL:
   ```
   postgresql://user:pass@host/db?connection_limit=5
   ```

2. Monitoring database connections:
```bash
   fly postgres connect -a your-db-app
   SELECT count(*) FROM pg_stat_activity;
```

## Monitoring and Debugging

1. **View logs:**
```bash
   fly logs --app linkai-voice-server
   ```

2. **SSH into container:**
   ```bash
   fly ssh console --app linkai-voice-server
   ```

3. **Check WebSocket connections:**
   The server logs all WebSocket connections and configuration retrievals.

4. **Database queries:**
   Enable Prisma query logging by setting:
   ```bash
   fly secrets set DEBUG="prisma:query"
   ```

## Scaling

1. **Increase instances:**
```bash
   fly scale count 2 --app linkai-voice-server
   ```

2. **Increase memory:**
```bash
   fly scale vm shared-cpu-1x --memory 512 --app linkai-voice-server
```

## Troubleshooting

### Voice Configuration Not Loading

1. Check database connection:
   ```bash
   fly ssh console
   node -e "require('./lib/prisma').chatbot.findFirst().then(console.log)"
   ```

2. Verify callSid is being passed correctly
3. Check main app is storing configuration properly

### WebSocket Connection Failures

1. Verify VOICE_SERVER_URL in main app includes `wss://`
2. Check Fly.io app is running: `fly status`
3. Review logs for connection errors

### High Latency

1. Consider deploying to region closer to users
2. Optimize database queries
3. Enable Fly.io's connection pooling

## Security Best Practices

1. **Rotate internal API key regularly**
2. **Use read-only database user if possible**
3. **Monitor for unusual connection patterns**
4. **Keep dependencies updated:**
   ```bash
   npm update
   npm audit fix
   ```

## Rollback Procedure

If issues occur:

1. **Quick rollback:**
   ```bash
   fly releases --app linkai-voice-server
   fly deploy --image <previous-image-ref>
   ```

2. **Revert to previous version:**
   ```bash
   git checkout <previous-commit>
   fly deploy
   ``` 