# Link AI Voice Server

This is the dedicated WebSocket server for handling voice calls through Twilio Media Streams and OpenAI's Realtime API.

## Architecture

- Persistent WebSocket connections for real-time voice communication
- Connects Twilio Media Streams to OpenAI Realtime API
- Handles thousands of concurrent voice calls
- Auto-scaling with Fly.io

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

3. Run the server:
```bash
npm run dev
```

## Deployment to Fly.io

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login to Fly:
```bash
flyctl auth login
```

3. Create the app (first time only):
```bash
flyctl launch
```

4. Set secrets:
```bash
flyctl secrets set DATABASE_URL="your-database-url"
flyctl secrets set ALLOWED_ORIGINS="https://dashboard.getlinkai.com"
```

5. Deploy:
```bash
flyctl deploy
```

## Scaling

Monitor and scale based on load:
```bash
# View metrics
flyctl dashboard

# Scale horizontally
flyctl scale count 3

# Set auto-scaling
flyctl autoscale set min=2 max=20
```

## Health Monitoring

- Health check endpoint: `/health`
- WebSocket endpoint: `/api/twilio/media-stream`
- Metrics available at: `/metrics`

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment (production/development)
- `PORT`: Server port (default: 3000)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS 