import express from 'express';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { LinkAIVoiceAgent } from './livekit-agent.js';
import { TwilioLiveKitBridge } from './twilio-livekit-bridge.js';
import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config();

/**
 * LinkAI Voice Server v2.0
 * 
 * Architecture:
 * 1. Twilio calls create LiveKit rooms
 * 2. AI agents join as participants  
 * 3. Real-time audio processing with sub-2s latency
 * 
 * Features:
 * - Stable LiveKit Client SDK
 * - Silero VAD for voice detection
 * - Optimized audio pipeline
 * - Health monitoring
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables validation
const requiredEnvVars = [
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY', 
  'LIVEKIT_API_SECRET',
  'DEEPGRAM_API_KEY',
  'ELEVENLABS_API_KEY',
  'LINKAI_API_KEY'
];

console.log('🚀 Starting LinkAI Voice Server v2.0');
console.log('📋 Environment Check:');

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

requiredEnvVars.forEach(varName => {
  console.log(`   - ${varName}: ✅ Configured`);
});

// LiveKit configuration
const liveKitUrl = process.env.LIVEKIT_URL;
const liveKitApiKey = process.env.LIVEKIT_API_KEY;
const liveKitApiSecret = process.env.LIVEKIT_API_SECRET;

// Initialize LiveKit Room Service Client
const roomService = new RoomServiceClient(liveKitUrl, liveKitApiKey, liveKitApiSecret);

// Initialize Twilio-LiveKit Bridge
const bridge = new TwilioLiveKitBridge({
  liveKitUrl: liveKitUrl,
  liveKitApiKey: liveKitApiKey,
  liveKitApiSecret: liveKitApiSecret
});

// Active agents tracking
const activeAgents = new Map();
const activeRooms = new Map();

// Middleware
app.use(express.json());

// CORS middleware for web voice interface
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

app.use(express.urlencoded({ extended: true }));
  
  // Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
      status: 'healthy', 
    service: 'linkai-voice-server',
    version: '2.0.0-stable',
      timestamp: new Date().toISOString(),
    activeAgents: activeAgents.size,
    activeRooms: activeRooms.size,
    environment: {
      livekit: liveKitUrl ? 'configured' : 'missing',
      deepgram: process.env.DEEPGRAM_API_KEY ? 'configured' : 'missing',
      elevenlabs: process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing',
      linkai: process.env.LINKAI_API_KEY ? 'configured' : 'missing'
    }
  });
});

// Audio storage for streaming (temporary in-memory cache)
const audioCache = new Map();

/**
 * Serve generated audio files for streaming
 */
app.get('/audio/:audioId', (req, res) => {
  try {
    const { audioId } = req.params;
    const audioData = audioCache.get(audioId);
    
    if (!audioData) {
      console.log(`❌ Audio not found: ${audioId}`);
      return res.status(404).json({ error: 'Audio not found' });
    }
    
    console.log(`🎵 Serving audio: ${audioId} (${audioData.length} bytes)`);
    
    // Set appropriate headers for audio streaming
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioData.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    // Send audio data
    res.send(audioData);
    
    // Clean up after 30 seconds
    setTimeout(() => {
      audioCache.delete(audioId);
      console.log(`🗑️ Cleaned up audio: ${audioId}`);
    }, 30000);
    
  } catch (error) {
    console.error('❌ Error serving audio:', error);
    res.status(500).json({ error: 'Failed to serve audio' });
  }
});
  
  // Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>LinkAI Voice Server v2.0</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .status { color: #28a745; font-weight: bold; }
        .metric { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>🎙️ LinkAI Voice Server v2.0</h1>
      <p class="status">✅ Server is running and healthy</p>
      
      <div class="metric">
        <h3>📊 Real-time Metrics</h3>
        <p><strong>Active Agents:</strong> ${activeAgents.size}</p>
        <p><strong>Active Rooms:</strong> ${activeRooms.size}</p>
        <p><strong>Server Uptime:</strong> ${Math.floor(process.uptime())}s</p>
      </div>
      
      <div class="metric">
        <h3>🔧 Architecture</h3>
        <p>• Stable LiveKit Client SDK</p>
        <p>• Silero VAD for voice detection</p>
        <p>• Deepgram STT + LinkAI + ElevenLabs TTS</p>
        <p>• Target latency: &lt;2 seconds</p>
      </div>
      
      <div class="metric">
        <h3>🔗 Endpoints</h3>
        <p><strong>Health:</strong> <a href="/health">/health</a></p>
        <p><strong>Twilio Voice:</strong> /twilio/voice (POST)</p>
        <p><strong>Agent Management:</strong> /agents (GET)</p>
      </div>
    </body>
    </html>
  `);
});

/**
 * Twilio voice webhook endpoint
 * Creates LiveKit room and starts AI agent
 */
app.post('/twilio/voice', async (req, res) => {
  try {
    console.log('📞 Incoming Twilio call...');
    console.log('Call details:', {
      from: req.body.From,
      to: req.body.To,
      callSid: req.body.CallSid,
      direction: req.body.Direction
    });

    const callSid = req.body.CallSid;
    const from = req.body.From;
    const to = req.body.To;
    
    // Create unique room for this call
    const roomName = `call-${callSid}`;
    
    try {
      // Create LiveKit room
      console.log(`🏠 Creating LiveKit room: ${roomName}`);
      const room = await roomService.createRoom({
        name: roomName,
        emptyTimeout: 300, // 5 minutes
        maxParticipants: 10,
        metadata: JSON.stringify({
          callSid: callSid,
          from: from,
          to: to,
          createdAt: new Date().toISOString(),
          type: 'voice-call'
        })
      });
      
      activeRooms.set(roomName, {
        room: room,
        callSid: callSid,
        createdAt: new Date(),
        participants: []
      });
      
      console.log(`✅ Room created: ${roomName}`);
      
      // Generate tokens for participants
      const callerToken = await generateParticipantToken(roomName, `caller-${from.replace('+', '')}`);
      const agentToken = await generateParticipantToken(roomName, `agent-${callSid}`);
      
      // Start AI agent in background
      setTimeout(async () => {
        await startAIAgent(roomName, agentToken, callSid);
      }, 1000); // Small delay to ensure room is ready
      
      // Generate TwiML response to connect caller to LiveKit
      const twiml = generateTwiMLResponse(roomName, callerToken);
      
      res.type('text/xml');
      res.send(twiml);
      
    } catch (roomError) {
      console.error('❌ Error creating room:', roomError);
      
      // Fallback TwiML
      const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">I'm sorry, but I'm having trouble connecting your call right now. Please try again later.</Say>
          <Hangup/>
        </Response>`;
      
      res.type('text/xml');
      res.send(fallbackTwiml);
    }
    
  } catch (error) {
    console.error('❌ Error handling Twilio webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate participant token for LiveKit room
 */
async function generateParticipantToken(roomName, participantIdentity) {
  const token = new AccessToken(liveKitApiKey, liveKitApiSecret, {
    identity: participantIdentity,
    ttl: '1h',
  });
  
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  
  return await token.toJwt();
}

/**
 * Generate TwiML response to connect caller to LiveKit
 */
function generateTwiMLResponse(roomName, callerToken) {
  const bridgePort = process.env.BRIDGE_PORT || 8080;
  const bridgeHost = process.env.BRIDGE_HOST || 'localhost';
  const bridgeUrl = `wss://${bridgeHost}:${bridgePort}/stream/${roomName}?token=${callerToken}`;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="alice">Please hold while I connect you to our AI assistant.</Say>
      <Connect>
        <Stream url="${bridgeUrl}" />
      </Connect>
    </Response>`;
}

/**
 * Start AI agent for a room
 */
async function startAIAgent(roomName, agentToken, callSid) {
  try {
    console.log(`🤖 Starting AI agent for room: ${roomName}`);
    
    // Create agent configuration
    const agentConfig = {
      linkaiApiKey: process.env.LINKAI_API_KEY,
      linkaiApiUrl: process.env.LINKAI_API_URL,
      agentId: process.env.AGENT_ID || 'default',
      deepgramApiKey: process.env.DEEPGRAM_API_KEY,
      elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
      elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID,
      maxHistoryLength: 20,
      vadSensitivity: 0.6,
      endpointingMs: 1000
    };
    
    // Create and connect agent
    const agent = new LinkAIVoiceAgent(agentConfig);
    await agent.connect(process.env.LIVEKIT_URL, agentToken, roomName);
    
    // Track active agent
    activeAgents.set(callSid, {
      agent: agent,
      roomName: roomName,
      startedAt: new Date(),
      callSid: callSid
    });
    
    console.log(`✅ AI agent started for call: ${callSid}`);
    
    // Set up cleanup when room ends
    agent.room.on('disconnected', () => {
      console.log(`🔌 Agent disconnected from room: ${roomName}`);
      cleanupAgent(callSid);
    });
    
  } catch (error) {
    console.error(`❌ Error starting AI agent for room ${roomName}:`, error);
  }
}

/**
 * Cleanup agent and room resources
 */
function cleanupAgent(agentId) {
  const agentInfo = activeAgents.get(agentId);
  if (agentInfo) {
    try {
      agentInfo.agent.disconnect();
    } catch (error) {
      console.error('Error disconnecting agent:', error);
    }
    activeAgents.delete(agentId);
    
    // Cleanup room
    activeRooms.delete(agentInfo.roomName);
    console.log(`🧹 Cleaned up agent: ${agentId} (${agentInfo.type || 'phone'}) and room: ${agentInfo.roomName}`);
  }
}

/**
 * Get active agents info
 */
app.get('/agents', (req, res) => {
  const agents = Array.from(activeAgents.entries()).map(([callSid, info]) => ({
    callSid: callSid,
    roomName: info.roomName,
    startedAt: info.startedAt,
    uptime: Date.now() - info.startedAt.getTime()
  }));
  
  const rooms = Array.from(activeRooms.entries()).map(([roomName, info]) => ({
    roomName: roomName,
    callSid: info.callSid,
    createdAt: info.createdAt,
    participants: info.participants.length
  }));
  
  res.json({
    agents: agents,
    rooms: rooms,
    totalAgents: activeAgents.size,
    totalRooms: activeRooms.size
  });
});

/**
 * Cleanup endpoint for testing
 */
app.post('/cleanup/:callSid', (req, res) => {
  const callSid = req.params.callSid;
  cleanupAgent(callSid);
  res.json({ message: `Cleaned up agent for call: ${callSid}` });
});

/**
 * Process user speech from web client
 * Called when web client sends transcribed speech for AI processing
 */
app.post('/process-speech', async (req, res) => {
  const requestStart = Date.now();
  try {
    console.log('🗣️ Processing speech from web client...');
    console.log(`⏱️  [TIMING] Request received at ${new Date().toISOString()}`);
    
    const { roomName, transcript, userId } = req.body;
    
    if (!roomName || !transcript) {
      return res.status(400).json({ 
        error: 'Missing roomName or transcript',
        required: ['roomName', 'transcript'] 
      });
    }

    console.log(`📝 Speech from ${userId || 'user'}: "${transcript}"`);
    
    // Find the active agent for this room
    const agentWrapper = activeAgents.get(`web-${roomName}`);
    
    if (!agentWrapper || !agentWrapper.agent) {
      console.error(`❌ No active agent found for room: ${roomName}`);
      return res.status(404).json({ 
        error: 'No active agent for room',
        roomName 
      });
    }
    
    // Process the speech with the agent's AI pipeline
    const timingStart = Date.now();
    console.log(`⏱️  [TIMING] Starting LinkAI processing at ${new Date().toISOString()}`);
    
    const aiResponse = await agentWrapper.agent.processUserMessage(transcript);
    
    const processingTime = Date.now() - timingStart;
    console.log(`⏱️  [TIMING] LinkAI processing completed in ${processingTime}ms`);
    
    if (aiResponse) {
      console.log(`🤖 AI Response (${processingTime}ms): "${aiResponse}"`);
      
      // Generate ElevenLabs audio if configured
      let audioUrl = null;
      const agentConfig = agentWrapper.config;
      
      if (agentConfig.elevenlabsApiKey && agentConfig.elevenlabsVoiceId) {
        try {
          const ttsStart = Date.now();
          console.log(`🎵 Generating ElevenLabs audio with voice: ${agentConfig.elevenlabsVoiceId}`);
          console.log(`⏱️  [TIMING] Starting ElevenLabs TTS generation at ${new Date().toISOString()}`);
          
          const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${agentConfig.elevenlabsVoiceId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': agentConfig.elevenlabsApiKey
            },
            body: JSON.stringify({
              text: aiResponse,
              model_id: 'eleven_turbo_v2_5', // Fast model for low latency
              voice_settings: {
                stability: 0.3,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true
              }
            })
          });
          
          if (elevenLabsResponse.ok) {
            const audioBuffer = await elevenLabsResponse.arrayBuffer();
            const ttsTime = Date.now() - ttsStart;
            console.log(`⏱️  [TIMING] ElevenLabs TTS completed in ${ttsTime}ms`);
            
            // Store audio in cache with unique ID
            const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            audioCache.set(audioId, Buffer.from(audioBuffer));
            
            // Create audio URL
            audioUrl = `https://voice-server.fly.dev/audio/${audioId}`;
            
            console.log(`✅ ElevenLabs audio cached: ${audioId} (${audioBuffer.byteLength} bytes)`);
          } else {
            const ttsTime = Date.now() - ttsStart;
            console.log(`⏱️  [TIMING] ElevenLabs TTS failed in ${ttsTime}ms`);
            console.error('❌ ElevenLabs API error:', elevenLabsResponse.status, elevenLabsResponse.statusText);
          }
        } catch (error) {
          console.error('❌ Error generating ElevenLabs audio:', error);
        }
      } else {
        console.log('⚠️ ElevenLabs not configured, returning text only');
      }
      
      // Return AI response with audio URL for streaming
      const totalTime = Date.now() - requestStart;
      console.log(`⏱️  [TIMING] Total request completed in ${totalTime}ms (LinkAI: ${processingTime}ms)`);
      
      res.json({ 
        success: true,
        response: aiResponse,
        audioUrl: audioUrl,
        processingTime,
        totalTime,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('🤐 No AI response generated');
      res.json({ 
        success: false,
        error: 'No response generated',
        processingTime
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing speech:', error);
    res.status(500).json({ 
      error: 'Failed to process speech',
      details: error.message 
    });
  }
});

/**
 * Get agent status for web client
 */
app.get('/agent-status/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const agentWrapper = activeAgents.get(`web-${roomName}`);
    
    if (!agentWrapper || !agentWrapper.agent) {
      return res.status(404).json({ 
        error: 'Agent not found',
        roomName 
      });
    }
    
    res.json({
      status: 'active',
      roomName,
      isProcessing: agentWrapper.agent.isProcessing,
      conversationHistory: agentWrapper.agent.conversationHistory,
      connected: agentWrapper.agent.isConnected
    });
    
  } catch (error) {
    console.error('❌ Error getting agent status:', error);
    res.status(500).json({ 
      error: 'Failed to get agent status',
      details: error.message 
    });
  }
});

/**
 * Start AI agent for web voice calls
 * Called by web interface after creating a LiveKit room
 */
app.post('/start-web-agent', async (req, res) => {
  try {
    console.log('🌐 Starting web voice agent...');
    
    const { roomName, agentConfig } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ 
        error: 'Missing roomName',
        required: ['roomName'] 
      });
    }

    console.log(`🏠 Starting agent for web room: ${roomName}`);
    console.log('🤖 Agent config:', agentConfig ? 'provided' : 'using defaults');
    
    // Generate agent token
    const agentToken = await generateParticipantToken(roomName, `web-agent-${Date.now()}`);
    
    // Start AI agent in background
    const agentPromise = startWebAIAgent(roomName, agentToken, agentConfig);
    
    // Don't wait for agent to fully start, return immediately
    res.json({ 
      success: true, 
      roomName,
      message: 'Agent starting...',
      timestamp: new Date().toISOString()
    });
    
    // Handle agent startup in background
    agentPromise.catch(error => {
      console.error(`❌ Error starting web agent for room ${roomName}:`, error);
    });
    
        } catch (error) {
    console.error('❌ Error in start-web-agent endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to start web agent',
      details: error.message 
    });
  }
});

/**
 * Start AI agent for web voice call
 */
async function startWebAIAgent(roomName, agentToken, providedConfig = {}) {
  try {
    console.log(`🤖 Starting web AI agent for room: ${roomName}`);
    
    // Create agent configuration with web-optimized defaults
    const agentConfig = {
      // LinkAI Configuration
      linkaiApiKey: process.env.LINKAI_API_KEY,
      linkaiApiUrl: process.env.LINKAI_API_URL || 'https://dashboard.getlinkai.com/api',
      agentId: providedConfig.agentId || process.env.AGENT_ID || 'default',
      
      // Voice service configuration
      deepgramApiKey: process.env.DEEPGRAM_API_KEY,
      elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
      elevenlabsVoiceId: providedConfig.elevenLabsVoiceId || process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
      
      // Agent behavior from provided config
      systemPrompt: providedConfig.systemPrompt || providedConfig.prompt || 'You are a helpful AI voice assistant. Keep responses concise and conversational.',
      language: providedConfig.language || 'en-US',
      temperature: providedConfig.temperature || 0.7,
      
      // Performance tuning for web
      maxHistoryLength: 20,
      vadSensitivity: 0.6,
      endpointingMs: 800, // Slightly faster for web
      
      // Source tracking
      source: 'web',
      ...providedConfig
    };
    
    // Create and connect agent
    const agent = new LinkAIVoiceAgent(agentConfig);
    await agent.connect(process.env.LIVEKIT_URL, agentToken, roomName);
    
    // Track active agent
    const agentId = `web-${roomName}`;
    activeAgents.set(agentId, {
      agent: agent,
      roomName: roomName,
      startedAt: new Date(),
      type: 'web',
      config: agentConfig
    });
    
    console.log(`✅ Web AI agent started for room: ${roomName}`);
    
    // Set up cleanup timer (simplified approach)  
    setTimeout(() => {
      console.log(`⏰ Cleaning up web agent after timeout: ${roomName}`);
      cleanupAgent(agentId);
    }, 300000); // 5 minutes timeout
    
    return agent;
    
  } catch (error) {
    console.error(`❌ Error starting web AI agent for room ${roomName}:`, error);
    throw error;
  }
}

// Graceful shutdown handling
const server = createServer(app);

const gracefulShutdown = (signal) => {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  
  // Cleanup all active agents
  console.log(`🧹 Cleaning up ${activeAgents.size} active agents...`);
  for (const [callSid, agentInfo] of activeAgents.entries()) {
    try {
      agentInfo.agent.disconnect();
    } catch (error) {
      console.error(`Error disconnecting agent ${callSid}:`, error);
    }
  }
  
  activeAgents.clear();
  activeRooms.clear();
  
  // Stop bridge server
  bridge.stop();
  
  server.close(() => {
    console.log('💚 Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🎙️ LinkAI Voice Server v2.0 Started');
  console.log(`📡 Server listening on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Status page: http://localhost:${PORT}/`);
  console.log(`🤖 Agents API: http://localhost:${PORT}/agents`);
  console.log('');

  // Start Twilio-LiveKit Bridge
  const bridgePort = process.env.BRIDGE_PORT || 8080;
  bridge.start(bridgePort);
  console.log(`🌉 Bridge server started on port ${bridgePort}`);

  console.log('✅ Ready to handle voice calls with sub-2-second latency!');
  console.log('🎯 Architecture: Twilio → Bridge → LiveKit → AI Agent → LinkAI Runtime');
  console.log('');
});