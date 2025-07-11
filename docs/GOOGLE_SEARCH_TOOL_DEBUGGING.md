# Google Search Tool Debugging Guide

## Overview

The Google Search tool now includes comprehensive debugging and logging capabilities to help troubleshoot issues, monitor performance, and understand how the tool is being used. This guide explains the various debugging features and how to interpret the logs.

## Debug Log Categories

### 🔍 **Tool Invocation Logging**
**Event**: `Google Search Tool Invoked`
**Purpose**: Logs when the tool is first called with input parameters

```json
{
  "agentId": "agent-123",
  "userId": "user-456",
  "query": "search query here",
  "queryLength": 25,
  "numResults": 5,
  "safeSearch": "medium",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 🔧 **Configuration Validation**
**Event**: `Configuration Check`
**Purpose**: Validates agent configuration and web search settings

```json
{
  "agentId": "agent-123",
  "hasKnowledgeConfig": true,
  "useWebSearch": true,
  "websiteInstructionsCount": 3,
  "websiteInstructions": [
    {"url": "https://example.com", "hasInstructions": true}
  ],
  "websiteUrls": ["https://example.com"]
}
```

### 🔑 **API Credentials Check**
**Event**: `API Credentials Check`
**Purpose**: Validates Google Search API credentials (without exposing values)

```json
{
  "agentId": "agent-123",
  "hasApiKey": true,
  "hasSearchEngineId": true,
  "apiKeyLength": 39,
  "searchEngineIdLength": 21,
  "processingTime": 15
}
```

### 📝 **Query Processing**
**Event**: `Query Processing`
**Purpose**: Shows how the search query is sanitized and processed

```json
{
  "agentId": "agent-123",
  "originalQuery": "what is the weather like today?",
  "sanitizedQuery": "what is the weather like today?",
  "originalLength": 30,
  "sanitizedLength": 30,
  "wasTruncated": false,
  "processingTime": 25
}
```

### 🔗 **Search URL Construction**
**Event**: `Search URL Construction`
**Purpose**: Shows the parameters used to build the Google Search API URL

```json
{
  "agentId": "agent-123",
  "baseUrl": "https://www.googleapis.com/customsearch/v1",
  "searchEngineId": "search-engine-id",
  "query": "search query",
  "numResults": 5,
  "safeSearch": "medium",
  "processingTime": 30
}
```

### 🌐 **Site Restrictions**
**Event**: `Site Restrictions Applied` or `No Site Restrictions`
**Purpose**: Shows if and how site restrictions are applied to the search

```json
{
  "agentId": "agent-123",
  "websiteUrls": ["https://example.com", "https://demo.com"],
  "siteRestrictionDetails": [
    {"url": "https://example.com", "domain": "example.com", "restriction": "site:example.com"}
  ],
  "siteRestrictions": "site:example.com OR site:demo.com",
  "hasSiteRestrictions": true,
  "processingTime": 45
}
```

### 🚀 **API Request Execution**
**Event**: `Executing Google Search`
**Purpose**: Logs the actual API request being made

```json
{
  "agentId": "agent-123",
  "query": "search query",
  "numResults": 5,
  "safeSearch": "medium",
  "searchUrl": "https://www.googleapis.com/customsearch/v1?cx=...&q=...",
  "hasSiteRestrictions": true,
  "siteRestrictions": "site:example.com",
  "processingTime": 50
}
```

### 📡 **API Response**
**Event**: `API Response Received`
**Purpose**: Logs the HTTP response from Google Search API

```json
{
  "agentId": "agent-123",
  "status": 200,
  "statusText": "OK",
  "ok": true,
  "contentType": "application/json",
  "requestTime": 1250,
  "processingTime": 1300
}
```

### 📊 **Response Parsing**
**Event**: `Response Parsed`
**Purpose**: Shows what data was received from the API

```json
{
  "agentId": "agent-123",
  "hasItems": true,
  "itemsCount": 5,
  "hasSearchInformation": true,
  "totalResults": "About 1,234,567 results",
  "searchTime": 0.45,
  "hasError": false,
  "responseParseTime": 15,
  "processingTime": 1315
}
```

### 📄 **Individual Result Processing**
**Event**: `Processing Result 1`, `Processing Result 2`, etc.
**Purpose**: Shows details of individual search results (first 3 only)

```json
{
  "agentId": "agent-123",
  "resultIndex": 0,
  "title": "Example Page Title",
  "url": "https://example.com/page",
  "domain": "example.com",
  "snippetLength": 156,
  "snippetPreview": "This is a preview of the search result snippet showing the first 100 characters..."
}
```

### 📋 **Results Summary**
**Event**: `Results Processing Complete`
**Purpose**: Summarizes the processing of all search results

```json
{
  "agentId": "agent-123",
  "totalResults": "About 1,234,567 results",
  "returnedResults": 5,
  "processedResults": 5,
  "resultProcessingTime": 25,
  "processingTime": 1340
}
```

### 📈 **Usage Tracking**
**Event**: `Usage Tracking Success` or `Failed to track web search usage`
**Purpose**: Shows if usage tracking was successful

```json
{
  "agentId": "agent-123",
  "userId": "user-456",
  "trackingTime": 50,
  "processingTime": 1390
}
```

### ✅ **Success Summary**
**Event**: `Google Search Completed Successfully`
**Purpose**: Final summary of successful search execution

```json
{
  "agentId": "agent-123",
  "userId": "user-456",
  "query": "search query",
  "resultCount": 5,
  "totalResults": "About 1,234,567 results",
  "googleSearchTime": 0.45,
  "totalProcessingTime": 1400,
  "performance": {
    "requestTime": 1250,
    "responseParseTime": 15,
    "resultProcessingTime": 25,
    "totalTime": 1400,
    "isSlowRequest": false,
    "isSlowTotal": false,
    "googleApiTime": 0.45
  },
  "summary": {
    "successful": true,
    "hasResults": true,
    "usedSiteRestrictions": true,
    "configuredWebsites": 2
  }
}
```

## Error Debugging

### ❌ **Configuration Errors**
When web search is not configured:
```json
{
  "success": false,
  "error": "I don't have live search configured yet...",
  "debug": {
    "configurationIssue": "Web search not enabled or no website instructions configured",
    "useWebSearch": false,
    "websiteInstructionsCount": 0
  }
}
```

### ❌ **Credentials Errors**
When API credentials are missing:
```json
{
  "success": false,
  "error": "Live search isn't available right now...",
  "debug": {
    "credentialsIssue": "API key or search engine ID not configured",
    "hasApiKey": false,
    "hasSearchEngineId": true
  }
}
```

### ❌ **Query Validation Errors**
When query is empty or invalid:
```json
{
  "success": false,
  "error": "Search query cannot be empty.",
  "debug": {
    "queryIssue": "Empty or invalid query provided",
    "originalQuery": ""
  }
}
```

### ❌ **API Errors**
When Google Search API returns errors:
```json
{
  "success": false,
  "error": "Search API error: Daily Limit Exceeded",
  "debug": {
    "apiError": "Google Search API returned error",
    "errorCode": 403,
    "errorMessage": "Daily Limit Exceeded"
  }
}
```

### ❌ **HTTP Errors**
When HTTP request fails:
```json
{
  "success": false,
  "error": "Search request failed: 429 Too Many Requests",
  "debug": {
    "apiError": "HTTP request failed",
    "status": 429,
    "statusText": "Too Many Requests",
    "requestTime": 2500
  }
}
```

### ❌ **Unexpected Errors**
When unexpected exceptions occur:
```json
{
  "success": false,
  "error": "Search failed: Network timeout",
  "debug": {
    "unexpectedError": "Caught exception during search execution",
    "errorType": "TypeError",
    "errorMessage": "Network timeout",
    "processingTime": 5000
  }
}
```

## Performance Monitoring

### ⚠️ **Performance Warnings**
The tool automatically logs performance warnings for slow operations:

```json
{
  "event": "Slow Google Search Performance",
  "agentId": "agent-123",
  "query": "search query",
  "performance": {
    "requestTime": 3500,
    "isSlowRequest": true,
    "isSlowTotal": true,
    "totalTime": 4000
  },
  "suggestion": "Consider optimizing query or checking network conditions"
}
```

### Performance Thresholds
- **Slow Request**: API request takes > 2000ms
- **Slow Total**: Total processing takes > 3000ms

## Log Filtering

To filter logs by specific events, use these log tags:

```bash
# All Google Search tool logs
grep "google-search-tool" logs/app.log

# Only successful searches
grep "Google Search Completed Successfully" logs/app.log

# Only errors
grep "❌" logs/app.log

# Performance issues
grep "⚠️ Slow Google Search Performance" logs/app.log

# Configuration issues
grep "Configuration Check" logs/app.log
```

## Debugging Common Issues

### 1. **No Results Returned**
Check logs for:
- Site restrictions configuration
- Query processing details
- API response parsing
- Total results count from Google

### 2. **Slow Performance**
Monitor:
- `requestTime` in performance logs
- `totalProcessingTime` values
- Performance warnings
- Google API response times

### 3. **Authentication Issues**
Verify:
- API credentials check logs
- Error messages mentioning credentials
- HTTP status codes (401, 403)

### 4. **Configuration Problems**
Review:
- Configuration check logs
- Website instructions setup
- Site restrictions application

### 5. **API Quota Issues**
Look for:
- HTTP 429 status codes
- "Daily Limit Exceeded" errors
- API error codes in response parsing

## Best Practices

1. **Monitor Performance**: Regular check performance logs to identify slow queries
2. **Review Configuration**: Verify site restrictions and website instructions are working
3. **Track Usage**: Monitor usage tracking logs for billing and quota management
4. **Error Analysis**: Use debug information in error responses to diagnose issues
5. **Query Optimization**: Use query processing logs to understand how queries are modified

## Integration with Monitoring Tools

The structured logging format is designed to work with monitoring tools like:
- **Datadog**: Query by `service:google-search-tool`
- **New Relic**: Filter by log attributes
- **Elasticsearch**: Search by structured fields
- **CloudWatch**: Create dashboards from log metrics

All logs include `agentId`, `userId`, and `processingTime` for consistent tracking across your application. 