# Voice Server Deployment Guide

This guide will walk you through deploying the Link AI Voice Server to Fly.io.

## Prerequisites

1. Fly.io account connected to GitHub (✅ You've already done this)
2. Database URL from your main application
3. Fly CLI installed

## Step 1: Install Fly CLI

If you haven't already:
```bash
curl -L https://fly.io/install.sh | sh
```

Add to your PATH:
```bash
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"
```

## Step 2: Login to Fly

```bash
flyctl auth login
```

## Step 3: Navigate to Voice Server Directory

```bash
cd voice-server
```

## Step 4: Create the Fly App

```bash
flyctl launch --no-deploy
```

When prompted:
- App name: `linkai-voice` (or choose your own)
- Region: Choose closest to your users (e.g., `iad` for US East)
- Don't add any databases
- Don't deploy yet

## Step 5: Set Environment Secrets

Get your database URL from your main app's environment variables, then:

```bash
# Set the database URL (same as your main app)
flyctl secrets set DATABASE_URL="postgresql://..."

# Set allowed origins
flyctl secrets set ALLOWED_ORIGINS="https://dashboard.getlinkai.com,https://www.getlinkai.com"
```

## Step 6: Deploy

```bash
flyctl deploy
```

## Step 7: Verify Deployment

Check the logs:
```bash
flyctl logs
```

Test the health endpoint:
```bash
curl https://linkai-voice.fly.dev/health
```

## Step 8: Update Main Application

Add to your main app's `.env` file:
```
VOICE_SERVER_URL=wss://linkai-voice.fly.dev
```

## Step 9: Configure Scaling (Production)

For production with thousands of calls:

```bash
# Set minimum instances
flyctl scale count 2

# Configure auto-scaling
flyctl autoscale set min=2 max=20

# Set machine size (for higher load)
flyctl scale vm shared-cpu-2x
```

## Step 10: Monitor Performance

```bash
# View dashboard
flyctl dashboard

# Monitor logs
flyctl logs --tail

# Check metrics
flyctl status
```

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL is correct
- Check allowed origins include your domains
- Ensure Twilio webhooks point to correct URL

### Performance Issues
- Scale up instances: `flyctl scale count 4`
- Upgrade machine type: `flyctl scale vm dedicated-cpu-1x`
- Check database connection pooling

### Debugging
- SSH into instance: `flyctl ssh console`
- View real-time logs: `flyctl logs --tail`
- Check app status: `flyctl status`

## Cost Estimates

For thousands of calls per day:
- 2-4 shared instances: ~$10-20/month
- With auto-scaling: ~$20-50/month depending on usage
- Dedicated instances for high load: ~$60-120/month

## Next Steps

1. Set up monitoring alerts
2. Configure custom domain (optional)
3. Set up database connection pooling for high load
4. Configure rate limiting if needed 