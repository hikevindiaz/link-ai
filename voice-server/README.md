# Link AI Voice Server

WebSocket server for handling real-time voice conversations with Link AI agents using Twilio Media Streams and OpenAI Realtime API.

## Architecture

The voice server acts as a bridge between:
- **Twilio Media Streams**: Receives audio from phone calls
- **OpenAI Realtime API**: Processes voice conversations
- **Link AI Database**: Retrieves agent configurations

### Key Features

- Direct database connectivity for full agent configuration access
- Support for custom voices and personalities
- Integration with knowledge sources and tools
- Real-time voice interruption handling
- Automatic fallback for configuration issues

## How It Works

1. **Call Initiation**: Main app receives Twilio webhook, stores configuration in database
2. **WebSocket Connection**: Twilio connects to voice server via WebSocket
3. **Configuration Retrieval**: Voice server fetches full agent config using callSid
4. **OpenAI Connection**: Establishes connection to OpenAI Realtime API with agent settings
5. **Audio Streaming**: Bidirectional audio streaming between caller and AI

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string (same as main app)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
- `NODE_ENV`: Environment (development/production)
- `MAIN_APP_URL`: URL of main application (optional)
- `INTERNAL_API_KEY`: Key for secure API communication (optional)

## Development

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Access to OpenAI API

### Setup

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

3. Copy environment file:
```bash
   cp env.example .env
```

4. Configure `.env` with your values

5. Run development server:
```bash
npm run dev
```

### Testing

Test WebSocket connection:
```bash
wscat -c ws://localhost:3000/api/twilio/media-stream
```

Test health endpoint:
```bash
curl http://localhost:3000/health
```

## Production Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy to Fly.io

```bash
fly launch
fly secrets set DATABASE_URL="your-database-url"
fly deploy
```

## Agent Configuration

The voice server retrieves comprehensive agent configuration including:

- **Basic Settings**: Name, prompt, voice, temperature
- **Voice Personality**: Custom voice settings and personality traits
- **Knowledge Sources**: Vector stores for RAG
- **Tools**: Built-in and custom function calling
- **Call Settings**: Timeouts, presence detection, error messages

### Voice Settings

Supports OpenAI voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

Custom voices can include:
- Personality descriptions
- Accent specifications
- Speed and pitch adjustments

## Security

- Database credentials are never exposed to clients
- WebSocket connections validated by origin
- Configuration stored temporarily with automatic cleanup
- Support for subaccount authentication tokens

## Monitoring

- Health check endpoint at `/health`
- Comprehensive logging of all connections and events
- Database connection status in health checks
- Active connection tracking

## Troubleshooting

### Common Issues

1. **Configuration not loading**: Check database connection and callSid
2. **Voice not working**: Verify voice ID is valid OpenAI voice
3. **High latency**: Consider regional deployment
4. **Connection drops**: Check WebSocket timeout settings

### Debug Mode

Enable detailed logging:
```bash
DEBUG=* npm run dev
```

## License

Proprietary - Link AI 