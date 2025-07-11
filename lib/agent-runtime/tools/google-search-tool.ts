import { logger } from '@/lib/logger';
import { AgentTool, AgentContext } from '../types';
import { trackWebSearch } from '@/lib/usage-tracking';

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Google Programmable Search JSON API Tool
 * 
 * This tool allows agents to search the web using Google's Programmable Search JSON API
 * when users have configured live search URLs with specific instructions.
 */
export const googleSearchTool: AgentTool = {
  id: 'google_search',
  name: 'google_search',
  description: 'EXTREMELY RESTRICTED: Search the web using Google\'s Programmable Search API ONLY when the user EXPLICITLY asks for current information from configured websites. DO NOT use for general questions, explanations, definitions, or any query that can be answered with general knowledge. This is NOT a fallback tool.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to execute. Be specific and use keywords that match the user\'s question.',
        maxLength: 200
      },
      num_results: {
        type: 'integer',
        description: 'Number of search results to return (1-10)',
        minimum: 1,
        maximum: 10,
        default: 5
      },
      safe_search: {
        type: 'string',
        description: 'Safe search level',
        enum: ['off', 'medium', 'high'],
        default: 'medium'
      }
    },
    required: ['query']
  },
  // Google search prompt needs to be dynamically generated based on configured websites
  systemPrompt: undefined,
  handler: async (args: { query: string; num_results?: number; safe_search?: string }, context: AgentContext) => {
    console.log('🔍 Google Search Tool Invoked', {
      query: args.query,
      numResults: args.num_results,
      agentId: context.agent.id,
      knowledgeConfig: context.agent.knowledgeConfig
    });
    
    const startTime = Date.now();
    const { query, num_results = 5, safe_search = 'medium' } = args;
    
    // DEBUG: Log initial tool invocation
    console.log('🔍 Google Search Tool Invoked', {
      agentId: context.agent.id,
      userId: context.agent.userId,
      query: query.substring(0, 100),
      queryLength: query.length,
      numResults: num_results,
      safeSearch: safe_search,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Check if web search is enabled for this agent
      const { agent } = context;
      const knowledgeConfig = agent.knowledgeConfig;
      
      // DEBUG: Log configuration details
      console.log('🔧 Configuration Check', {
        agentId: agent.id,
        hasKnowledgeConfig: !!knowledgeConfig,
        useWebSearch: knowledgeConfig?.useWebSearch,
        websiteInstructionsCount: knowledgeConfig?.websiteInstructions?.length || 0,
        websiteInstructions: knowledgeConfig?.websiteInstructions?.map(w => ({
          url: w.url,
          hasInstructions: !!w.instructions
        })) || [],
        websiteUrls: knowledgeConfig?.websiteUrls || []
      });
      
      if (!knowledgeConfig?.useWebSearch || !knowledgeConfig?.websiteInstructions?.length) {
        console.warn('❌ Google search attempted but web search not configured', {
          agentId: agent.id,
          query: query.substring(0, 50),
          useWebSearch: knowledgeConfig?.useWebSearch,
          websiteInstructionsLength: knowledgeConfig?.websiteInstructions?.length || 0,
          processingTime: Date.now() - startTime
        });
        
        return {
          success: false,
          error: 'I don\'t have live search configured yet, but I can help you with general information or any business-specific questions from my knowledge base.',
          content: 'Live search is not configured. Please provide a response based on general knowledge.',
          result_count: 0,
          fallback_suggestion: 'You can still ask me questions and I\'ll do my best to help with general knowledge or information from my knowledge base.',
          debug: {
            configurationIssue: 'Web search not enabled or no website instructions configured',
            useWebSearch: knowledgeConfig?.useWebSearch,
            websiteInstructionsCount: knowledgeConfig?.websiteInstructions?.length || 0
          }
        };
      }
      
      // Get API credentials
      const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
      
      // DEBUG: Log API credentials check (without exposing actual values)
      console.log('🔑 API Credentials Check', {
        agentId: agent.id,
        hasApiKey: !!apiKey,
        hasSearchEngineId: !!searchEngineId,
        apiKeyLength: apiKey?.length || 0,
        searchEngineIdLength: searchEngineId?.length || 0,
        processingTime: Date.now() - startTime
      });
      
      if (!apiKey || !searchEngineId) {
        console.error('❌ Google Search API credentials not configured', {
          agentId: agent.id,
          hasApiKey: !!apiKey,
          hasSearchEngineId: !!searchEngineId,
          processingTime: Date.now() - startTime
        });
        
        return {
          success: false,
          error: 'Live search isn\'t available right now, but I can help you with general information or questions from my knowledge base.',
          content: 'Live search is not available. Please provide a response based on general knowledge.',
          result_count: 0,
          fallback_suggestion: 'I can still assist you with general questions or information from my knowledge base.',
          debug: {
            credentialsIssue: 'API key or search engine ID not configured',
            hasApiKey: !!apiKey,
            hasSearchEngineId: !!searchEngineId
          }
        };
      }
      
      // Validate search query
      if (!query || query.trim().length === 0) {
        console.warn('❌ Empty search query provided', {
          agentId: agent.id,
          query: query,
          processingTime: Date.now() - startTime
        });
        
        return {
          success: false,
          error: 'Search query cannot be empty.',
          content: 'Search query was empty. Please provide a response based on general knowledge.',
          result_count: 0,
          debug: {
            queryIssue: 'Empty or invalid query provided',
            originalQuery: query
          }
        };
      }
      
      // Sanitize query
      const sanitizedQuery = query.trim().substring(0, 200);
      
      // DEBUG: Log query processing
      console.log('📝 Query Processing', {
        agentId: agent.id,
        originalQuery: query,
        sanitizedQuery: sanitizedQuery,
        originalLength: query.length,
        sanitizedLength: sanitizedQuery.length,
        wasTruncated: query.length > 200,
        processingTime: Date.now() - startTime
      });
      
      // Build search URL
      const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
      searchUrl.searchParams.set('key', apiKey);
      searchUrl.searchParams.set('cx', searchEngineId);
      searchUrl.searchParams.set('q', sanitizedQuery);
      searchUrl.searchParams.set('num', num_results.toString());
      searchUrl.searchParams.set('safe', safe_search);
      
      // DEBUG: Log base URL construction
      console.log('🔗 Search URL Construction', {
        agentId: agent.id,
        baseUrl: 'https://www.googleapis.com/customsearch/v1',
        searchEngineId: searchEngineId,
        query: sanitizedQuery,
        numResults: num_results,
        safeSearch: safe_search,
        processingTime: Date.now() - startTime
      });
      
      // Check for unrestricted search indicators and apply site restrictions if needed
      let siteRestrictions = '';
      let enableUnrestrictedSearch = false;
      
      if (knowledgeConfig.websiteUrls && knowledgeConfig.websiteUrls.length > 0) {
        // Check if google.com or other unrestricted search indicators are present
        const unrestrictedIndicators = ['google.com', 'www.google.com', 'search.google.com'];
        const hasUnrestrictedIndicator = knowledgeConfig.websiteUrls.some(url => {
          try {
            const domain = new URL(url).hostname.toLowerCase();
            return unrestrictedIndicators.includes(domain);
          } catch (e) {
            return false;
          }
        });
        
        if (hasUnrestrictedIndicator) {
          enableUnrestrictedSearch = true;
          
          // DEBUG: Log unrestricted search mode
          console.log('🌐 Unrestricted Web Search Enabled', {
            agentId: agent.id,
            websiteUrls: knowledgeConfig.websiteUrls,
            reason: 'Google.com or similar domain detected in URLs',
            enableUnrestrictedSearch: true,
            processingTime: Date.now() - startTime
          });
        } else {
          // Create site restriction for configured domains (excluding unrestricted indicators)
          const siteRestrictionDetails = knowledgeConfig.websiteUrls
            .filter(url => {
              // Filter out any unrestricted search indicators
              try {
                const domain = new URL(url).hostname.toLowerCase();
                return !unrestrictedIndicators.includes(domain);
              } catch (e) {
                return true; // Keep invalid URLs for error logging
              }
            })
            .map(url => {
              try {
                const domain = new URL(url).hostname;
                return { url, domain, restriction: `site:${domain}` };
              } catch (e) {
                console.warn('⚠️ Invalid website URL in configuration', {
                  agentId: agent.id,
                  invalidUrl: url,
                  error: e.message
                });
                return null;
              }
            })
            .filter(Boolean);
          
          if (siteRestrictionDetails.length > 0) {
            siteRestrictions = siteRestrictionDetails
              .map(detail => detail.restriction)
              .join(' OR ');
            
            searchUrl.searchParams.set('siteSearch', siteRestrictions);
          }
          
          // DEBUG: Log site restrictions
          console.log('🌐 Site Restrictions Applied', {
            agentId: agent.id,
            websiteUrls: knowledgeConfig.websiteUrls,
            siteRestrictionDetails: siteRestrictionDetails,
            siteRestrictions: siteRestrictions,
            hasSiteRestrictions: !!siteRestrictions,
            processingTime: Date.now() - startTime
          });
        }
      } else {
        // DEBUG: Log no site restrictions
        console.log('🌐 No Site Restrictions', {
          agentId: agent.id,
          websiteUrlsCount: knowledgeConfig.websiteUrls?.length || 0,
          processingTime: Date.now() - startTime
        });
      }
      
      // DEBUG: Log final search URL (without API key)
      const debugUrl = new URL(searchUrl.toString());
      debugUrl.searchParams.delete('key'); // Remove API key for logging
      
      console.log('🚀 Executing Google Search', {
        agentId: agent.id,
        query: sanitizedQuery,
        numResults: num_results,
        safeSearch: safe_search,
        searchUrl: debugUrl.toString(),
        hasSiteRestrictions: !!siteRestrictions,
        siteRestrictions: siteRestrictions,
        processingTime: Date.now() - startTime
      });
      
      // Execute search
      const requestStartTime = Date.now();
      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'LinkAI-Agent/1.0'
        }
      });
      const requestTime = Date.now() - requestStartTime;
      
      // DEBUG: Log API response details
      console.log('📡 API Response Received', {
        agentId: agent.id,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        requestTime: requestTime,
        processingTime: Date.now() - startTime
      });
      
      if (!response.ok) {
        console.error('❌ Google Search API request failed', {
          agentId: agent.id,
          status: response.status,
          statusText: response.statusText,
          query: sanitizedQuery,
          requestTime: requestTime,
          processingTime: Date.now() - startTime
        });
        
        return {
          success: false,
          error: `Search request failed: ${response.status} ${response.statusText}`,
          content: `Search request failed. Please provide a response based on general knowledge.`,
          result_count: 0,
          debug: {
            apiError: 'HTTP request failed',
            status: response.status,
            statusText: response.statusText,
            requestTime: requestTime
          }
        };
      }
      
      const responseParseStartTime = Date.now();
      const searchResponse: GoogleSearchResponse = await response.json();
      const responseParseTime = Date.now() - responseParseStartTime;
      
      // DEBUG: Log response parsing
      console.log('📊 Response Parsed', {
        agentId: agent.id,
        hasItems: !!searchResponse.items,
        itemsCount: searchResponse.items?.length || 0,
        hasSearchInformation: !!searchResponse.searchInformation,
        totalResults: searchResponse.searchInformation?.totalResults || '0',
        searchTime: searchResponse.searchInformation?.searchTime || 0,
        hasError: !!searchResponse.error,
        errorCode: searchResponse.error?.code,
        errorMessage: searchResponse.error?.message,
        responseParseTime: responseParseTime,
        processingTime: Date.now() - startTime
      });
      
      // Handle API errors
      if (searchResponse.error) {
        console.error('❌ Google Search API error', {
          agentId: agent.id,
          error: searchResponse.error,
          query: sanitizedQuery,
          errorCode: searchResponse.error.code,
          errorMessage: searchResponse.error.message,
          processingTime: Date.now() - startTime
        });
        
        return {
          success: false,
          error: `Search API error: ${searchResponse.error.message}`,
          content: `Search API error occurred. Please provide a response based on general knowledge.`,
          result_count: 0,
          debug: {
            apiError: 'Google Search API returned error',
            errorCode: searchResponse.error.code,
            errorMessage: searchResponse.error.message
          }
        };
      }
      
      // Process results
      const results = searchResponse.items || [];
      const resultProcessingStartTime = Date.now();
      
      // Process results for AI synthesis instead of just returning links
      const processedResults = results.map((item, index) => {
        const result = {
          title: item.title,
          url: item.link,
          snippet: item.snippet,
          domain: item.displayLink,
          formattedUrl: item.formattedUrl
        };
        
        // DEBUG: Log individual result details (first few only to avoid spam)
        if (index < 3) {
          console.log(`📄 Processing Result ${index + 1}`, {
            agentId: agent.id,
            resultIndex: index,
            title: item.title?.substring(0, 100) || 'No title',
            url: item.link,
            domain: item.displayLink,
            snippetLength: item.snippet?.length || 0,
            snippetPreview: item.snippet?.substring(0, 100) || 'No snippet'
          });
        }
        
        return result;
      });

      // Create synthesized content for AI to use in response
      const synthesizedContent = results.length > 0 
        ? `Based on current web search results for "${sanitizedQuery}":\n\n` +
          results.map((item, index) => 
            `${index + 1}. **${item.title}** (${item.displayLink})\n   ${item.snippet}\n`
          ).join('\n') +
          '\n\nUse this information to provide a comprehensive and helpful response to the user\'s question.'
        : `No current web results found for "${sanitizedQuery}". Please provide a helpful response based on general knowledge.`;
      
      const resultProcessingTime = Date.now() - resultProcessingStartTime;
      
      // DEBUG: Log result processing summary
      console.log('📋 Results Processing Complete', {
        agentId: agent.id,
        totalResults: searchResponse.searchInformation?.totalResults || '0',
        returnedResults: results.length,
        processedResults: processedResults.length,
        resultProcessingTime: resultProcessingTime,
        processingTime: Date.now() - startTime
      });
      
      // Track usage
      const trackingStartTime = Date.now();
      try {
        await trackWebSearch(agent.userId, sanitizedQuery, agent.id);
        
        // DEBUG: Log usage tracking success
        console.log('📈 Usage Tracking Success', {
          agentId: agent.id,
          userId: agent.userId,
          trackingTime: Date.now() - trackingStartTime,
          processingTime: Date.now() - startTime
        });
      } catch (trackingError) {
        console.warn('⚠️ Failed to track web search usage', {
          agentId: agent.id,
          userId: agent.userId,
          error: trackingError.message,
          trackingTime: Date.now() - trackingStartTime,
          processingTime: Date.now() - startTime
        });
      }
      
      const totalProcessingTime = Date.now() - startTime;
      
      // DEBUG: Log successful completion with performance analysis
      const performanceAnalysis = {
        requestTime: requestTime,
        responseParseTime: responseParseTime,
        resultProcessingTime: resultProcessingTime,
        totalTime: totalProcessingTime,
        isSlowRequest: requestTime > 2000,
        isSlowTotal: totalProcessingTime > 3000,
        googleApiTime: searchResponse.searchInformation?.searchTime || 0
      };
      
      // Performance warning for slow requests
      if (performanceAnalysis.isSlowRequest || performanceAnalysis.isSlowTotal) {
        console.warn('⚠️ Slow Google Search Performance', {
          agentId: agent.id,
          query: sanitizedQuery,
          performance: performanceAnalysis,
          suggestion: 'Consider optimizing query or checking network conditions'
        });
      }
      
      console.log('✅ Google Search Completed Successfully', {
        agentId: agent.id,
        userId: agent.userId,
        query: sanitizedQuery,
        resultCount: processedResults.length,
        totalResults: searchResponse.searchInformation?.totalResults || '0',
        googleSearchTime: searchResponse.searchInformation?.searchTime || 0,
        totalProcessingTime: totalProcessingTime,
        performance: performanceAnalysis,
        summary: {
          successful: true,
          hasResults: processedResults.length > 0,
          usedSiteRestrictions: !!siteRestrictions,
          enabledUnrestrictedSearch: enableUnrestrictedSearch,
          configuredWebsites: knowledgeConfig.websiteUrls?.length || 0
        }
      });
      
      return {
        success: true,
        query: sanitizedQuery,
        content: synthesizedContent,
        result_count: processedResults.length,
        total_results: searchResponse.searchInformation?.totalResults || '0',
        search_time: searchResponse.searchInformation?.searchTime || 0,
        raw_results: processedResults, // Keep raw results for debugging
        debug: {
          processingTime: totalProcessingTime,
          requestTime: requestTime,
          resultCount: processedResults.length,
          hasSiteRestrictions: !!siteRestrictions,
          enabledUnrestrictedSearch: enableUnrestrictedSearch,
          siteRestrictions: siteRestrictions
        }
      };
      
    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;
      
      console.error('❌ Google Search Tool Error', {
        agentId: context.agent.id,
        userId: context.agent.userId,
        error: error.message,
        errorStack: error.stack,
        query: query.substring(0, 50),
        queryLength: query.length,
        numResults: num_results,
        safeSearch: safe_search,
        totalProcessingTime: totalProcessingTime,
        errorType: error.constructor.name
      });
      
      return {
        success: false,
        error: `Search failed: ${error.message}`,
        content: `Search failed due to unexpected error. Please provide a response based on general knowledge.`,
        result_count: 0,
        debug: {
          unexpectedError: 'Caught exception during search execution',
          errorType: error.constructor.name,
          errorMessage: error.message,
          processingTime: totalProcessingTime
        }
      };
    }
  }
}; 