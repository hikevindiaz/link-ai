const http = require('http');
const WebSocket = require('ws');
const { parse } = require('url');
require('dotenv').config();

// Environment variables
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];

// Import the WebSocket handler and call config
const { handleTwilioWebSocket } = require('./lib/twilio-websocket-handler');
const { getCallConfig, getAgentConfiguration } = require('./lib/call-config');

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS for health checks
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const { pathname } = parse(req.url, true);
  
  // Health check endpoint
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      service: 'voice-server',
      timestamp: new Date().toISOString(),
      database: DATABASE_URL ? 'configured' : 'not configured'
    }));
    return;
  }
  
  // Root endpoint
  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Link AI Voice Server - WebSocket endpoint at /api/twilio/media-stream');
    return;
  }
  
  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrade requests
server.on('upgrade', async (request, socket, head) => {
  const { pathname, query } = parse(request.url, true);
  
  console.log(`WebSocket upgrade request: ${pathname}`, {
    origin: request.headers.origin || 'none',
    userAgent: request.headers['user-agent'] || 'none',
    queryParams: Object.keys(query).join(', ')
  });
  
  // Verify origin if in production (skip for Twilio media stream endpoint)
  if (process.env.NODE_ENV === 'production' && pathname !== '/api/twilio/media-stream') {
    const origin = request.headers.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin) && !ALLOWED_ORIGINS.includes('*')) {
      console.error('WebSocket connection rejected - invalid origin:', origin);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
  }
  
  // Handle Twilio media stream WebSocket connections
  if (pathname === '/api/twilio/media-stream') {
    // Skip origin check for Twilio connections (they don't send origin header)
    console.log('Twilio WebSocket connection request from:', request.headers['user-agent'] || 'Unknown');
    
    wss.handleUpgrade(request, socket, head, async (ws) => {
      console.log('WebSocket upgraded, waiting for Twilio start message...');
      
      // Create a temporary handler to wait for the start message
      const startMessageHandler = async (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.event === 'start') {
            console.log('Received Twilio start message:', data);
            
            // Extract custom parameters from the start message
            const customParams = data.start.customParameters || {};
            console.log('Custom parameters:', customParams);
            
            // Get callSid from custom parameters
            const callSid = customParams.callSid;
            
            if (!callSid) {
              console.error('No callSid provided in custom parameters');
              ws.close(1008, 'Missing callSid parameter');
              return;
            }
            
            // Retrieve full configuration from database
            console.log(`Retrieving configuration for callSid: ${callSid}`);
            const config = await getCallConfig(callSid);
            
            if (!config) {
              console.error('Failed to retrieve call configuration', { callSid });
              
              // Fallback: Try to use minimal config from custom parameters
              if (customParams.agentId && customParams.openAIKey) {
                console.log('Using fallback configuration from custom parameters');
                const fallbackConfig = {
                  agentId: customParams.agentId,
                  openAIKey: customParams.openAIKey,
              prompt: customParams.prompt || 'You are a helpful AI assistant.',
              voice: customParams.voice || 'alloy',
                  temperature: customParams.temperature ? parseFloat(customParams.temperature) : 0.8,
                  tools: [],
                  vectorStoreIds: []
                };
                
                // Remove this temporary handler
                ws.removeListener('message', startMessageHandler);
            
                // Handle with fallback config
                await handleTwilioWebSocket(ws, fallbackConfig);
                return;
              }
              
              ws.close(1008, 'Failed to retrieve call configuration');
              return;
            }
            
            console.log('Retrieved full configuration:', {
              agentId: config.agentId,
              hasOpenAIKey: !!config.openAIKey,
              voice: config.voice?.openAIVoice || config.voice,
              toolCount: config.tools?.length || 0,
              vectorStoreCount: config.vectorStoreIds?.length || 0
            });
            
            // Remove this temporary handler
            ws.removeListener('message', startMessageHandler);
            
            // Now handle the connection with the full config
            console.log('Starting Twilio WebSocket handler with full configuration...');
            
            // Pass the original start message to the handler
            config.startMessage = message;
            await handleTwilioWebSocket(ws, config);
          }
        } catch (error) {
          console.error('Error processing start message:', error);
          ws.close(1011, 'Error processing start message');
        }
      };
      
      // Set a timeout in case we don't receive a start message (increased to 30 seconds)
      const startTimeout = setTimeout(() => {
        if (ws.readyState === ws.OPEN) {
          console.error('Timeout waiting for start message');
          ws.close(1008, 'Timeout waiting for start message');
        }
      }, 30000);
      
      // Listen for the start message with timeout clearing
      const wrappedHandler = async (message) => {
        clearTimeout(startTimeout);
        await startMessageHandler(message);
      };
      
      ws.on('message', wrappedHandler);
    });
  } else {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Voice server listening on port ${PORT}`);
  console.log('WebSocket endpoint: /api/twilio/media-stream');
  console.log('Health check: /health');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Database:', DATABASE_URL ? 'Connected' : 'Not configured');
}); 