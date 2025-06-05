const http = require('http');
const WebSocket = require('ws');
const { parse } = require('url');
require('dotenv').config();

// Environment variables
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];

// Import the WebSocket handler
const { handleTwilioWebSocket } = require('./lib/twilio-websocket-handler');

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
      timestamp: new Date().toISOString() 
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
    
    // Debug: Log the full URL and parsed query
    console.log('Full request URL:', request.url);
    console.log('Note: Twilio strips query parameters from WebSocket URLs');
    
    // With Twilio, we need to get parameters from the start message instead of URL
    // For now, we'll accept the connection and wait for the start message
    wss.handleUpgrade(request, socket, head, async (ws) => {
      console.log('WebSocket upgraded, waiting for Twilio start message with parameters...');
      
      // Create a temporary handler to wait for the start message
      const startMessageHandler = async (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.event === 'start') {
            console.log('Received Twilio start message:', data);
            
            // Extract custom parameters from the start message
            const customParams = data.start.customParameters || {};
            console.log('Custom parameters:', customParams);
            
            // Build config from custom parameters
            const config = {
              agentId: customParams.agentId || null,
              openAIKey: customParams.openAIKey || null,
              prompt: customParams.prompt || 'You are a helpful AI assistant.',
              voice: customParams.voice || 'alloy',
              temperature: customParams.temperature ? parseFloat(customParams.temperature) : 0.8
            };
            
            console.log('Extracted config:', {
              agentId: config.agentId ? 'present' : 'missing',
              openAIKey: config.openAIKey ? 'present (first 10 chars: ' + config.openAIKey.substring(0, 10) + '...)' : 'missing',
              voice: config.voice,
              temperature: config.temperature
            });
            
            // Validate required parameters
            if (!config.agentId || !config.openAIKey) {
              console.error('Missing required parameters in start message:', { 
                agentId: !!config.agentId, 
                openAIKey: !!config.openAIKey 
              });
              ws.close(1008, 'Missing required parameters');
              return;
            }
            
            // Remove this temporary handler
            ws.removeListener('message', startMessageHandler);
            
            // Now handle the connection with the extracted config
            console.log('Starting Twilio WebSocket handler with extracted config...');
            await handleTwilioWebSocket(ws, config);
          }
        } catch (error) {
          console.error('Error processing start message:', error);
          ws.close(1011, 'Error processing start message');
        }
      };
      
      // Listen for the start message
      ws.on('message', startMessageHandler);
      
      // Set a timeout in case we don't receive a start message
      setTimeout(() => {
        if (ws.readyState === ws.OPEN) {
          console.error('Timeout waiting for start message');
          ws.close(1008, 'Timeout waiting for start message');
        }
      }, 5000);
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
}); 