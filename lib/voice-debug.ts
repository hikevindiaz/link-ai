/**
 * Voice Connection Debugging Utilities
 * Provides helper functions to debug WebSocket connections
 */

// Debug flag - set to true to enable verbose logging
const DEBUG_ENABLED = true;

/**
 * Log a debug message if debugging is enabled
 */
export function debugLog(message: string, data?: any): void {
  if (!DEBUG_ENABLED) return;
  
  if (data) {
    console.log(`[Voice Debug] ${message}`, data);
  } else {
    console.log(`[Voice Debug] ${message}`);
  }
}

/**
 * Test a WebSocket connection
 * @param url The WebSocket URL to test
 * @returns Promise that resolves when connection is successful or rejects with error
 */
export function testWebSocketConnection(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      debugLog(`Testing WebSocket connection to: ${url}`);
      
      const ws = new WebSocket(url);
      
      // Set timeout for connection
      const timeout = setTimeout(() => {
        debugLog(`Connection timeout for: ${url}`);
        ws.close();
        reject(new Error('Connection timeout'));
      }, 10000);
      
      ws.onopen = () => {
        debugLog(`Connection successful to: ${url}`);
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };
      
      ws.onerror = (error) => {
        debugLog(`Connection error for: ${url}`, error);
        clearTimeout(timeout);
        reject(error);
      };
      
      ws.onclose = (event) => {
        debugLog(`Connection closed for: ${url} - Code: ${event.code}, Reason: ${event.reason}`);
      };
    } catch (error) {
      debugLog(`Error testing connection: ${error}`);
      reject(error);
    }
  });
}

/**
 * Parse and sanitize WebSocket URL for display
 * Removes API keys and sensitive information
 */
export function sanitizeUrlForDisplay(url: string): string {
  try {
    // Create URL object to parse the URL
    const urlObj = new URL(url);
    
    // Remove API key parameter if present
    if (urlObj.searchParams.has('api_key')) {
      urlObj.searchParams.set('api_key', '***API_KEY_HIDDEN***');
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, do basic sanitization
    return url.replace(/api_key=([^&]*)/, 'api_key=***API_KEY_HIDDEN***');
  }
}

/**
 * Add diagnostic features to a WebSocket
 * @param ws The WebSocket to enhance
 * @param label A label for logging
 */
export function enhanceWebSocketWithDiagnostics(ws: WebSocket, label: string): WebSocket {
  const originalOnOpen = ws.onopen;
  const originalOnError = ws.onerror;
  const originalOnClose = ws.onclose;
  
  ws.onopen = (event) => {
    debugLog(`[${label}] WebSocket connection opened`);
    if (originalOnOpen) originalOnOpen.call(ws, event);
  };
  
  ws.onerror = (event) => {
    debugLog(`[${label}] WebSocket error`, event);
    if (originalOnError) originalOnError.call(ws, event);
  };
  
  ws.onclose = (event) => {
    debugLog(`[${label}] WebSocket closed with code ${event.code} - ${event.reason}`);
    if (originalOnClose) originalOnClose.call(ws, event);
  };
  
  return ws;
} 