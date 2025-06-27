import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
// Vector store integration removed - using new vector service
import { processContentV2, formatContent } from "@/lib/vector-service";
import { uploadToSupabase } from "@/lib/supabase";
import * as cheerio from 'cheerio';
import { createRollbackHandler } from '@/lib/rollback-system';

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Function to fetch and process content with timeout
async function fetchWithTimeout(url: string, timeout = 5000, bypassSSL = false) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const fetch = (await import('node-fetch')).default;
      const https = await import('https');
      
    const agent = bypassSSL 
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;
    
    const response = await fetch(url, { 
      signal: controller.signal,
      agent
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    return html;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Discover URLs to crawl from a main domain
 */
async function discoverUrls(
  baseUrl: string,
  urlMatch: string,
  maxPages: number,
  bypassSSL: boolean = false
): Promise<string[]> {
  console.log(`[discoverUrls] Starting discovery from: ${baseUrl}`);
  
  const discoveredUrls = new Set<string>([baseUrl]); // Start with base URL
  const toVisit = [baseUrl];
  const visited = new Set<string>();
  
  try {
    const baseUrlObj = new URL(baseUrl);
    const baseDomain = baseUrlObj.hostname;
    
    while (toVisit.length > 0 && discoveredUrls.size < maxPages) {
      const currentUrl = toVisit.shift()!;
      
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);
      
      try {
        console.log(`[discoverUrls] Analyzing: ${currentUrl}`);
        const html = await fetchWithTimeout(currentUrl, 5000, bypassSSL);
        const $ = cheerio.load(html);
        
        // Find all links on the page
        $('a[href]').each((_, element) => {
          const href = $(element).attr('href');
          if (!href) return;
          
          try {
            let fullUrl: string;
            
            // Handle relative URLs
            if (href.startsWith('/')) {
              fullUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${href}`;
            } else if (href.startsWith('http')) {
              fullUrl = href;
            } else {
              // Relative to current path
              fullUrl = new URL(href, currentUrl).toString();
            }
            
            const urlObj = new URL(fullUrl);
            
            // Only include URLs from the same domain that match our criteria
            if (
              urlObj.hostname === baseDomain &&
              urlObj.hostname.includes(urlMatch) &&
              !discoveredUrls.has(fullUrl) &&
              discoveredUrls.size < maxPages &&
              // Avoid common non-content URLs
              !fullUrl.includes('#') &&
              !fullUrl.includes('?') &&
              !fullUrl.match(/\.(pdf|jpg|jpeg|png|gif|css|js|xml|rss)$/i)
            ) {
              discoveredUrls.add(fullUrl);
              
              // Add to visit queue for further discovery (if we need more URLs)
              if (!visited.has(fullUrl) && toVisit.length < 10) {
                toVisit.push(fullUrl);
              }
            }
          } catch (urlError) {
            // Skip invalid URLs
          }
        });
      } catch (pageError) {
        console.warn(`[discoverUrls] Failed to analyze ${currentUrl}:`, pageError);
      }
    }
    
    const result = Array.from(discoveredUrls).slice(0, maxPages);
    console.log(`[discoverUrls] Discovered ${result.length} URLs:`, result);
    return result;
    
  } catch (error) {
    console.error(`[discoverUrls] Error during discovery:`, error);
    // Fallback to just the base URL
    return [baseUrl];
  }
}

async function extractCleanContent(html: string, url: string): Promise<string> {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Remove script tags, style tags, and other non-content elements
  const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, .navigation, #navigation, [role="navigation"]');
  elementsToRemove.forEach(el => el.remove());

  // Extract main content areas
  const contentSelectors = [
    'main',
    '[role="main"]',
    '.main-content',
    '.content',
    'article',
    '.article-content',
    'body'
  ];

  let mainContent = null;
  for (const selector of contentSelectors) {
    mainContent = document.querySelector(selector);
    if (mainContent) break;
  }

  if (!mainContent) {
    mainContent = document.body;
  }

  // Extract text content and structure
  const extractStructuredText = (element: Element): string => {
    let text = '';
    
    for (const child of element.children) {
      const tagName = child.tagName.toLowerCase();
      
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        const level = '#'.repeat(parseInt(tagName[1]));
        text += `\n${level} ${child.textContent?.trim()}\n\n`;
      } else if (['p', 'div', 'section', 'article'].includes(tagName)) {
        const content = child.textContent?.trim();
        if (content && content.length > 10) { // Filter out very short content
          text += `${content}\n\n`;
        }
      } else if (['ul', 'ol'].includes(tagName)) {
        const listItems = child.querySelectorAll('li');
        listItems.forEach(li => {
          const content = li.textContent?.trim();
          if (content) {
            text += `- ${content}\n`;
          }
        });
        text += '\n';
      } else {
        // Recursively process other elements
        text += extractStructuredText(child);
      }
    }
    
    return text;
  };

  let cleanText = extractStructuredText(mainContent);
  
  // Clean up the text
  cleanText = cleanText
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
    .trim();

  // If we didn't get much content, fall back to basic text extraction
  if (cleanText.length < 100) {
    cleanText = mainContent.textContent?.trim() || '';
    cleanText = cleanText
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

  return cleanText;
}

export async function POST(
  req: Request,
  { params }: { params: { crawlerId: string } }
) {
  // Create rollback handler for crawler operations
  const rollback = createRollbackHandler('website-crawler');
  let createdFile = null;
  
  try {
    // Check for user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if we should bypass SSL verification
    const bypassSSLVerification = req.headers.get('X-Bypass-SSL-Verification') === 'true';
    if (bypassSSLVerification) {
      console.log('SSL verification bypass requested - using relaxed security settings');
      // In Node.js environment, we can set this env variable to disable SSL verification
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    // Get crawler details with associated file
    const crawler = await db.crawler.findFirst({
      where: { 
        id: params.crawlerId,
        userId: session.user.id
      },
      include: {
        File: {
          select: {
            id: true,
            knowledgeSourceId: true
          }
        }
      }
    });

    if (!crawler) {
      return NextResponse.json({ error: "Crawler not found" }, { status: 404 });
    }

    // Get the existing file and knowledge source ID
    const existingFile = crawler.File[0];
    if (!existingFile?.knowledgeSourceId) {
      return NextResponse.json({ error: "No associated knowledge source found" }, { status: 400 });
    }

    const knowledgeSourceId = existingFile.knowledgeSourceId;

    try {
      // Vector store is created automatically when content is processed
      console.log('Processing content for knowledge source:', knowledgeSourceId);

      // Determine crawling strategy based on URL
      const urlObj = new URL(crawler.crawlUrl);
      const isMainDomain = urlObj.pathname === '/' || urlObj.pathname === '';
      const shouldCrawlMultiplePages = isMainDomain && crawler.maxPagesToCrawl > 1;

      console.log(`Crawling strategy: ${shouldCrawlMultiplePages ? 'Multi-page' : 'Single-page'} for URL: ${crawler.crawlUrl}`);

      let allContent = '';
      let crawledUrls = [];

      if (shouldCrawlMultiplePages) {
        // Multi-page crawling for main domain
        console.log(`Starting multi-page crawl with limit: ${crawler.maxPagesToCrawl}`);
        
        const discoveredUrls = await discoverUrls(crawler.crawlUrl, crawler.urlMatch, crawler.maxPagesToCrawl, bypassSSLVerification);
        console.log(`Discovered ${discoveredUrls.length} URLs to crawl`);
        
        for (const url of discoveredUrls) {
          try {
            console.log(`Crawling page: ${url}`);
            const html = await fetchWithTimeout(url, 5000, bypassSSLVerification);
            
            // Use the clean content extraction function
            const cleanContent = await extractCleanContent(html as string, url);
            
            if (cleanContent && cleanContent.length > 100) { // Only include pages with substantial content
              allContent += `\n\n## Page: ${url}\n\n${cleanContent}`;
              crawledUrls.push(url);
            }
          } catch (pageError) {
            console.warn(`Failed to crawl page ${url}:`, pageError);
            // Continue with other pages
          }
        }
      } else {
        // Single-page crawling for specific URL
        console.log('Fetching content from single URL:', crawler.crawlUrl);
      const html = await fetchWithTimeout(crawler.crawlUrl, 5000, bypassSSLVerification);
      
        // Use the clean content extraction function
        allContent = await extractCleanContent(html as string, crawler.crawlUrl);
        
        crawledUrls = [crawler.crawlUrl];
      }

      // Remove duplicate content and format into a clean markdown file
      const uniqueContent = new Set();
      const cleanedContent = allContent.split('\n\n## Page:').filter(section => {
        const contentHash = section.trim().substring(0, 200); // Use first 200 chars as hash
        if (uniqueContent.has(contentHash)) {
          return false; // Skip duplicate content
        }
        uniqueContent.add(contentHash);
        return section.trim().length > 100; // Only include substantial content
      }).join('\n\n## Page:');

      // Format into a markdown file for better processing
      const markdownContent = `# Crawled Content from ${crawler.crawlUrl}\n\n**Source:** ${crawler.crawlUrl}\n**Crawled Pages:** ${crawledUrls.length}\n**Last Updated:** ${new Date().toISOString().split('T')[0]}\n\n${shouldCrawlMultiplePages ? `**Pages crawled:**\n${crawledUrls.map(url => `- ${url}`).join('\n')}\n\n` : ''}${cleanedContent}`;
      
      // Create file with the content
      console.log('Saving crawled content...');
      const fileName = `crawled-content-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
      
      // CHECKPOINT 1: BUCKET UPLOAD
      console.log(`☁️ CHECKPOINT 1: Uploading crawled content to storage...`);
      const file_blob = new Blob([markdownContent], { type: 'text/markdown' });
      
      const uploadResult = await uploadToSupabase(
        file_blob,
        'files',
        'crawled',
        session.user.id,
        fileName
      );

      if (!uploadResult) {
        throw new Error('Failed to upload crawled content to storage');
      }
      
      // Record successful bucket upload for rollback
      rollback.recordBucketSuccess(uploadResult.url);
      console.log(`✅ CHECKPOINT 1 COMPLETE: Content uploaded to: ${uploadResult.url}`);

      // CHECKPOINT 2: DATABASE UPDATE
      try {
        console.log(`💾 CHECKPOINT 2: Updating file record in database...`);
        const file = await db.file.update({
          where: { id: existingFile.id },
          data: {
            blobUrl: uploadResult.url,
            storageUrl: uploadResult.url,
            storageProvider: 'supabase'
          }
        });
        createdFile = file;

        // Record successful database entry for rollback
        rollback.recordDatabaseSuccess('file', file.id);
        console.log(`✅ CHECKPOINT 2 COMPLETE: File record updated with ID: ${file.id}`);

        // CHECKPOINT 3: VECTOR PROCESSING
        try {
          console.log(`🧠 CHECKPOINT 3: Processing vectors for crawled content...`);
          
          // Ensure we have valid content before processing
          if (!markdownContent || markdownContent.trim().length === 0) {
            console.warn('No content extracted from crawled page');
            rollback.clear(); // Clear rollback since operation is complete
            return NextResponse.json({
              success: true,
              message: "Page crawled but no content extracted",
              fileId: file.id,
              storageUrl: uploadResult.url,
              content: "No content found"
            });
          }

          const { content: formattedContent, metadata } = formatContent('website', {
            url: crawler.crawlUrl,
            extractedContent: markdownContent,
            title: `Crawled: ${crawler.crawlUrl}`,
            extractedAt: new Date().toISOString()
          });

          // Validate formatted content before processing
          if (!formattedContent || formattedContent.trim().length === 0) {
            console.error('Formatted content is empty');
            throw new Error('No content to process for vector embeddings');
          }

          // Use a unique content ID for website crawling to avoid conflicts with file processing
          const websiteContentId = `crawler-${params.crawlerId}-${Date.now()}`;

          const vectorJobId = await processContentV2(
            knowledgeSourceId,
            websiteContentId,
            'website',
            { content: formattedContent, metadata }
          );

          // Record successful vector processing for rollback
          rollback.recordVectorSuccess(knowledgeSourceId, existingFile.id, 'website');
          console.log(`✅ CHECKPOINT 3 COMPLETE: Vector processing queued: ${vectorJobId}`);

        } catch (vectorError) {
          console.error(`❌ CHECKPOINT 3 FAILED: Vector processing failed`);
          
          // EXECUTE ROLLBACK
          await rollback.executeRollback(`Vector processing failed: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
          
          throw new Error(`Crawler processing failed at vector stage. All changes have been rolled back. Error: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`);
        }

      } catch (dbError) {
        console.error(`❌ CHECKPOINT 2 FAILED: Database update failed`);
        
        // EXECUTE ROLLBACK
        await rollback.executeRollback(`Database update failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        
        throw new Error(`Crawler processing failed at database stage. All changes have been rolled back. Error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
      
      // ALL CHECKPOINTS SUCCESSFUL
      rollback.clear();
      console.log(`🎉 ALL CHECKPOINTS COMPLETE: Crawler operation successful`);
      
      return NextResponse.json({
        success: true,
        message: "Content crawled and queued for vector processing",
        fileId: createdFile?.id,
        storageUrl: uploadResult.url,
        content: allContent.substring(0, 200) + "..." // Preview of content
      });
    } catch (error) {
      console.error('Error in crawling process:', error);
      
      // Handle specific SSL/certificate errors more gracefully
      if (error instanceof Error && 
          (error.message.includes('SSL') || 
           error.message.includes('certificate') || 
           error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
           error.message.includes('CERT_HAS_EXPIRED') ||
           error.message.includes('ECONNRESET'))) {
        console.log('SSL certificate error detected:', error.message);
        
        // If this was already a bypass attempt, report failure
        if (bypassSSLVerification) {
          return NextResponse.json({ 
            error: "SSL certificate error persists even with relaxed security settings.",
            details: { message: error.message },
            status: "failed",
            fileId: createdFile?.id
          }, { status: 500 });
        }
        
        // Otherwise suggest retrying with bypass
        return NextResponse.json({ 
          error: "SSL certificate error. Please try again with relaxed security settings.",
          details: { message: error.message },
          status: "retry_needed",
          cause: { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" },
          fileId: createdFile?.id
        }, { status: 500 }); 
      }
      
      // If we hit a timeout, return a specific status code
      if (error instanceof Error && error.message.includes('timed out')) {
        return NextResponse.json({ 
          error: "Operation timed out. The content may still be processing.",
          status: "processing",
          fileId: createdFile?.id
        }, { status: 202 }); // 202 Accepted indicates the request was accepted but processing is not complete
      }
      
      // Clean up any created files if we failed
      if (createdFile?.id) {
        try {
          await db.file.delete({
            where: { id: createdFile.id }
          });
        } catch (deleteError) {
          console.error('Error cleaning up file:', deleteError);
        }
      }
      
      // Log the full error details
      if (error instanceof Error && 'response' in error) {
        const errorWithResponse = error as Error & { response?: { status: number, headers: any, data: any } };
        console.error('Error response:', {
          status: errorWithResponse.response?.status,
          headers: errorWithResponse.response?.headers,
          data: errorWithResponse.response?.data
        });
      }

      // Return a more detailed error response
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : "Failed to crawl website",
        details: error instanceof Error && 'response' in error ? (error as any).response?.data : error,
        cause: error instanceof Error ? error.cause : undefined
      }, { status: error instanceof Error && 'status' in error ? (error as any).status : 500 });
    }
  } catch (error) {
    console.error('Error in crawler:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to crawl website",
      details: error
    }, { status: 500 });
    }
}