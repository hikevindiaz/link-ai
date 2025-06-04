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
  
  // Verify origin if in production
  if (process.env.NODE_ENV === 'production') {
    const origin = request.headers.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin) && !ALLOWED_ORIGINS.includes('*')) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
  }
  
  // Handle Twilio media stream WebSocket connections
  if (pathname === '/api/twilio/media-stream') {
    // Parse configuration from query parameters
    const config = {
      agentId: query.agentId,
      openAIKey: query.openAIKey,
      prompt: query.prompt ? decodeURIComponent(query.prompt) : undefined,
      voice: query.voice || 'alloy',
      temperature: query.temperature ? parseFloat(query.temperature) : 0.8
    };
    
    // Validate required parameters
    if (!config.agentId || !config.openAIKey) {
      console.error('Missing required parameters:', { 
        agentId: !!config.agentId, 
        openAIKey: !!config.openAIKey 
      });
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    
    wss.handleUpgrade(request, socket, head, async (ws) => {
      try {
        console.log('Handling WebSocket connection for agent:', config.agentId);
        await handleTwilioWebSocket(ws, config);
      } catch (error) {
        console.error('Error handling WebSocket connection:', error);
        ws.close(1011, 'Internal server error');
      }
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