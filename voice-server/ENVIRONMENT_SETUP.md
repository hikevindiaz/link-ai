# Voice Server Environment Setup

Based on your shared environment variables, here are the ones needed for the voice server:

## Required Environment Variables

Create a `.env` file in the `voice-server` directory with these values:

```bash
# Database Connection (from your main app)
DATABASE_URL="postgresql://prisma:LT38nFFEr6tCdlqt@db.ugnyocjdcpdlneirkfiq.supabase.co:5432/postgres"
DIRECT_URL="postgresql://prisma:LT38nFFEr6tCdlqt@db.ugnyocjdcpdlneirkfiq.supabase.co:5432/postgres"

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS="https://dashboard.getlinkai.com,http://localhost:3000"

# Main App URL (for API callbacks if needed)
MAIN_APP_URL="https://dashboard.getlinkai.com"

# Internal API Key (generate a secure random string)
# You can generate one with: openssl rand -hex 32
INTERNAL_API_KEY="your-secure-internal-api-key-here"
```

## Optional Environment Variables

These are not required but could be useful for future enhancements:

```bash
# Twilio Auth Token (if you want to validate webhooks in voice server)
TWILIO_AUTH_TOKEN="c0403e0a2b6ed5ef804696d43a64a841"

# Debug mode
DEBUG="prisma:query"  # Enable Prisma query logging
```

## Security Notes

1. **Never commit the `.env` file to git** - it's already in .gitignore
2. **Generate a secure INTERNAL_API_KEY** - don't use a simple string
3. **In production**, use Fly.io secrets instead of .env file

## Generate Internal API Key

Run this command to generate a secure internal API key:

```bash
openssl rand -hex 32
```

Or use Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
``` 