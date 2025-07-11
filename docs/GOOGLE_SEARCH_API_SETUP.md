# Google Programmable Search API Setup

This document explains how to configure the Google Programmable Search JSON API for your LinkAI agents to enable web search capabilities.

## Overview

The Google Programmable Search API tool allows agents to search the web and provide synthesized responses based on current web information. When users configure live search URLs with specific instructions, agents can access real-time information and provide comprehensive answers rather than just search result links.

## Prerequisites

1. A Google Cloud Platform account
2. A Google Custom Search Engine configured
3. The Google Custom Search JSON API enabled

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Custom Search JSON API:
   - Go to APIs & Services → Library
   - Search for "Custom Search JSON API"
   - Click on it and press "Enable"

### 2. Create an API Key

1. In the Google Cloud Console, go to APIs & Services → Credentials
2. Click "Create Credentials" → "API Key"
3. Copy the generated API key
4. (Optional) Restrict the API key to the Custom Search JSON API for security

### 3. Create a Custom Search Engine

1. Go to the [Google Custom Search Control Panel](https://cse.google.com/cse/all)
2. Click "Add"
3. Configure your search engine:
   - **Sites to search**: Enter `*` to search the entire web, or specific domains
   - **Language**: Select your preferred language
   - **Search engine name**: Give it a descriptive name
4. Click "Create"
5. In the search engine settings:
   - Go to "Setup" tab
   - Copy the "Search engine ID" (cx parameter)
   - Under "Search features", enable "Image search" if desired
   - Under "Advanced", you can configure SafeSearch and other options

## 2. Environment Variables

Add these to your `.env` file:

```bash
# Google Programmable Search API credentials
GOOGLE_CUSTOM_SEARCH_API_KEY=your-api-key-here
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-search-engine-id-here
```

### 5. Test the Configuration

You can test your configuration using curl:

```bash
curl "https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=YOUR_SEARCH_ENGINE_ID&q=test+query"
```

## How It Works

### Agent Configuration

The Google Search tool is automatically available to agents when:

1. **Live Search URLs are configured**: Users must add website URLs with search instructions in the knowledge base
2. **Web search is enabled**: The agent's knowledge configuration has `useWebSearch: true`
3. **API credentials are set**: The environment variables are properly configured

### Search Behavior

The tool supports two search modes:

- **Restricted Search**: When specific domain URLs are configured (e.g., `https://docs.example.com`), searches are limited to those domains using Google's `site:` operator
- **Unrestricted Search**: When `google.com`, `www.google.com`, or `search.google.com` is included in the website URLs, the tool performs a full web search without domain restrictions
- **Safe Search**: Configurable safe search levels (off, medium, high)
- **Result Limiting**: Configurable number of results (1-10)
- **Usage Tracking**: All searches are tracked for analytics

#### Enabling Unrestricted Web Search

To enable full web search (without domain restrictions), add `google.com` to your live search URLs in the knowledge base:

1. Go to your agent's knowledge base configuration
2. Add a new live search URL: `https://google.com`
3. Add instructions like: "Search the entire web for current information"

When `google.com` is detected in the URLs, the agent will perform unrestricted web searches instead of limiting results to specific domains.

### Example Agent Usage

#### Restricted Search Example
When a user configures a live search URL like:
- URL: `https://docs.example.com`
- Instructions: "When users ask about API documentation"

The agent will use Google Search to find current information from that domain when users ask relevant questions.

#### Unrestricted Search Example
When a user configures:
- URL: `https://google.com`
- Instructions: "Search the entire web for current information"
- URL: `https://docs.example.com`
- Instructions: "When users ask about API documentation"

The agent will perform unrestricted web searches (not limited to any domain) for general questions, while still being able to search specific domains when configured.

## Security Considerations

1. **API Key Security**: Store API keys securely and never commit them to version control
2. **Domain Restrictions**: Consider restricting searches to specific domains for security
3. **Rate Limiting**: Google has rate limits - monitor your usage
4. **Cost Management**: Google charges per search - implement usage tracking

## Cost Information

- Google Custom Search JSON API pricing: $5 per 1,000 queries
- First 100 queries per day are free
- Monitor usage through Google Cloud Console

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Check if the API is enabled and the API key is correct
2. **Invalid Search Engine ID**: Verify the search engine ID (cx parameter)
3. **No Results**: Check if the search engine is configured to search the entire web
4. **Quota Exceeded**: Monitor your daily quota limits

### Debug Mode

Enable debug logging to troubleshoot issues:

```javascript
// Check logs for 'google-search-tool' component
// Logs include search queries, results, and errors
```

## Integration with LinkAI

The Google Search tool integrates seamlessly with LinkAI's agent runtime:

1. **LLM Agnostic**: Works with both OpenAI and Gemini models
2. **Conditional Loading**: Only loads when web search is configured
3. **Usage Tracking**: Integrates with LinkAI's usage tracking system
4. **Error Handling**: Graceful error handling with fallback responses

## Best Practices

1. **Specific Instructions**: Provide clear, specific instructions for when to use each search URL
2. **Domain Targeting**: Use specific domains rather than searching the entire web
3. **Result Limits**: Use appropriate result limits to balance thoroughness with performance
4. **Monitor Usage**: Track API usage to manage costs
5. **Error Handling**: Implement proper error handling for API failures

## Support

For issues with the Google Search API integration, check:
1. Google Cloud Console for API quotas and errors
2. LinkAI logs for search tool execution
3. Agent configuration for proper web search setup 