# System Health API

This API endpoint provides real-time health checks for all critical services in the LinkAI infrastructure.

## Services Monitored

1. **Vercel Deployment** - Checks if the main application is responding
2. **Fly.io WebSockets** - Monitors the voice server running on Fly.io (`voice-server` app)
3. **Fly.io Tika Service** - Monitors the document processing service (`linkai-tika-service` app)
4. **Supabase Database** - Tests database connectivity and checks Supabase status

## Environment Variables Required

For full functionality, ensure these environment variables are set:

```bash
# Required for Fly.io health checks
FLY_API_TOKEN=your_fly_api_token_here

# Required for Tika service health check
TIKA_SERVICE_URL=https://linkai-tika-service.fly.dev

# Supabase credentials (usually already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## API Response Format

```json
{
  "overallStatus": "Operational", // "Operational" | "Degraded" | "Downtime" | "Maintenance"
  "lastUpdated": "2025-01-01T12:00:00.000Z",
  "services": [
    {
      "name": "Vercel Deployment",
      "status": "Operational",
      "uptime": "99.5%",
      "lastChecked": "Just now",
      "healthData": [
        {
          "date": "2025-01-01T00:00:00.000Z",
          "status": "Operational"
        }
        // ... 90 days of historical data
      ]
    }
    // ... other services
  ]
}
```

## Health Check Methods

### Vercel Deployment
- Tests if the main application `/api/session` endpoint responds
- Timeout: 10 seconds

### Fly.io Apps (WebSockets & Tika)
- Uses Fly.io Machines API to check if machines are running
- Falls back to mock data if `FLY_API_TOKEN` is not set
- For Tika: Also tests direct endpoint if Fly.io reports it's running

### Supabase Database
- Checks Supabase status API for external issues
- Tests database connection with a simple query
- Combines both checks for comprehensive status

## Historical Data

The API includes 90 days of historical status data for each service, showing:
- Daily status (Operational, Degraded, Downtime, Maintenance)
- Reliability patterns based on service type
- Used for uptime calculations and trend analysis

## Error Handling

- All health checks have appropriate timeouts
- Failed checks are logged but don't crash the endpoint
- Graceful degradation when external APIs are unavailable
- Mock data is used when API tokens are missing (development mode) 