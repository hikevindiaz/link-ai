# Vercel Analytics Integration Setup

The admin dashboard now includes real Vercel Analytics integration. Here's how to set it up:

## 1. Get Vercel API Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your profile (bottom left) → Settings
3. Go to "Tokens" tab
4. Click "Create Token"
5. Give it a name like "LinkAI Analytics"
6. Copy the generated token

## 2. Get Project Information (Optional)

For more accurate analytics, you can specify your project:

1. Go to your project in Vercel Dashboard
2. Go to Settings → General
3. Copy the "Project ID" 
4. If you're using a team, copy the "Team ID" from your team settings

## 3. Add Environment Variables

Add these to your `.env.local` file and Vercel environment variables:

```bash
# Required
VERCEL_API_TOKEN=your_api_token_here

# Optional (for more accurate filtering)
VERCEL_PROJECT_ID=your_project_id_here
VERCEL_TEAM_ID=your_team_id_here
```

## 4. Deploy

After adding the environment variables:

1. **Local development**: Restart your dev server
2. **Production**: Redeploy your Vercel app

## Features

✅ **Real Analytics Data**: Fetches actual page views and unique visitors from Vercel
✅ **Time Period Filtering**: 7 days, 30 days, 90 days
✅ **Fallback to Mock Data**: If API fails or isn't configured, shows realistic mock data
✅ **Loading States**: Proper skeleton loaders while fetching data
✅ **Error Handling**: Graceful fallbacks if Vercel API is unavailable

## Analytics Tab Features

- **Real-time metrics**: Page views and unique visitors
- **Interactive charts**: Click between metrics to see different views
- **Responsive design**: Works on mobile and desktop
- **Live status indicator**: Shows current online users (mock data)
- **Environment selector**: Production/Preview/All (UI only for now)

## Troubleshooting

### No Data Showing
- Check that your Vercel API token is valid
- Verify the project ID matches your deployed project
- Check browser console for API errors

### Mock Data Displayed
- This means the Vercel API token isn't configured or API call failed
- Check environment variables are properly set
- Verify token has correct permissions

### API Rate Limits
- Vercel Analytics API has rate limits
- The integration caches data to minimize API calls
- Consider implementing local caching if needed

## API Endpoints

The integration adds these admin-only endpoints:

- `GET /api/admin/vercel-analytics?period=30d` - Fetches analytics data
- Supports periods: `7d`, `30d`, `90d`

## Security

- Only admin users can access analytics data
- API token is server-side only (never exposed to client)
- All requests are authenticated and authorized 