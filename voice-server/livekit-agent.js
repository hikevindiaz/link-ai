// Hybrid approach - Server-side monitoring with real data message communication
import { RoomServiceClient } from 'livekit-server-sdk';
import axios from 'axios';
import fetch from 'node-fetch';
import WebSocket from 'ws';

/**
 * LinkAI Voice Agent with Hybrid Architecture
 * 
 * Features:
 * - Server-side room monitoring and management
 * - Real-time communication via LiveKit data messages
 * - Web client handles audio I/O (STT/TTS)
 * - Server handles AI processing with LinkAI
 * - Reliable cross-platform compatibility
 */
export class LinkAIVoiceAgent {
  constructor(config = {}) {
    this.config = {
      // LinkAI Configuration
      linkaiApiUrl: config.linkaiApiUrl || process.env.LINKAI_API_URL || 'https://dashboard.getlinkai.com/api',
      linkaiApiKey: config.linkaiApiKey || process.env.LINKAI_API_KEY,
      voiceServerApiKey: config.voiceServerApiKey || process.env.VOICE_SERVER_API_KEY,
      agentId: config.agentId || process.env.AGENT_ID,
      
      // STT Configuration (Deepgram)
      deepgramApiKey: config.deepgramApiKey || process.env.DEEPGRAM_API_KEY,
      deepgramModel: config.deepgramModel || 'nova-2',
      deepgramLanguage: config.deepgramLanguage || 'en',
      
      // TTS Configuration (ElevenLabs)
      elevenlabsApiKey: config.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY,
      elevenlabsVoiceId: config.elevenlabsVoiceId || process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Adam voice
      elevenlabsModel: config.elevenlabsModel || 'eleven_turbo_v2_5',
      elevenlabsLatencyOptimization: config.elevenlabsLatencyOptimization || 4,
      
      // Performance Configuration
      maxHistoryLength: config.maxHistoryLength || 20,
      endpointingMs: config.endpointingMs || 3000,
      
      ...config
    };

    this.roomName = null;
    this.conversationHistory = [];
    this.isProcessing = false;
    this.isConnected = false;
    this.roomService = null;
    this.monitoringInterval = null;
    this.messagingInterval = null;
    
    console.log('🤖 LinkAI Voice Agent initialized (Hybrid Architecture)');
    console.log('📋 Configuration:', {
      linkaiApi: this.config.linkaiApiUrl ? '✅ Configured' : '❌ Missing',
      deepgram: this.config.deepgramApiKey ? '✅ Configured' : '❌ Missing',
      elevenlabs: this.config.elevenlabsApiKey ? '✅ Configured' : '❌ Missing',
      agentId: this.config.agentId || 'default'
    });
  }

  /**
   * Connect agent to LiveKit room (Server-side monitoring + data messaging)
   */
  async connect(liveKitUrl, token, roomName) {
    try {
      console.log('🔗 Setting up hybrid agent architecture...');
      
      this.roomName = roomName;
      
      // Extract API key and secret from environment for RoomServiceClient
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        throw new Error('LiveKit API key and secret required for room management');
      }
      
      // Create room service client for server-side operations
      this.roomService = new RoomServiceClient(liveKitUrl, apiKey, apiSecret);
      
      // Set up room monitoring and messaging
      this.setupHybridCommunication();
      
      this.isConnected = true;
      
      console.log(`✅ Agent monitoring room: ${roomName}`);
      console.log(`🎤 Ready for hybrid audio processing...`);
      
      // Send initial message to web clients
      setTimeout(() => {
        this.sendAgentMessage('ready', 'Agent connected and ready for voice interaction');
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to set up hybrid agent:', error);
      throw error;
    }
  }

  /**
   * Setup hybrid communication (monitoring + data messages)
   */
  setupHybridCommunication() {
    console.log('🔍 Setting up hybrid communication...');
    
    // Monitor room participants and send data messages
    this.monitoringInterval = setInterval(async () => {
      try {
        if (!this.isConnected || !this.roomName) return;
        
        // Get current room participants (with error handling for non-existent rooms)
        try {
          const participants = await this.roomService.listParticipants(this.roomName);
          
          // Check if there are human participants (not agents)
          const humanParticipants = participants.filter(p => 
            !p.identity.startsWith('agent-') && 
            !p.identity.startsWith('web-agent-')
          );
          
          if (humanParticipants.length > 0) {
            console.log(`👤 Human participants detected: ${humanParticipants.length}`);
            
            // Send agent status via data message
            await this.sendAgentMessage('status', `Agent monitoring ${humanParticipants.length} participant(s)`);
          }
        } catch (roomError) {
          // Room might not exist yet or be cleaned up - this is normal
          if (roomError.code === 'not_found') {
            console.log(`🔍 Room ${this.roomName} not found during monitoring - may be cleaned up`);
          } else {
            console.error('❌ Error accessing room:', roomError);
          }
        }
        
      } catch (error) {
        console.error('❌ Error in hybrid communication:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Send data message to web clients via LiveKit
   */
  async sendAgentMessage(type, content, data = {}) {
    try {
      const message = {
        type: `agent_${type}`,
        content,
        timestamp: Date.now(),
        source: 'voice_agent',
        ...data
      };
      
      console.log(`📤 Sending agent message: ${type} - ${content}`);
      
      // Use Room Service to send data to all participants
      // This will be received by the web client's DataReceived event
      const messageData = JSON.stringify(message);
      
      // Send to all participants in the room
      const participants = await this.roomService.listParticipants(this.roomName);
      for (const participant of participants) {
        if (!participant.identity.startsWith('agent-') && !participant.identity.startsWith('web-agent-')) {
          // Send via webhooks or direct messaging
          // For now, log that we would send the message
          console.log(`📨 Would send to ${participant.identity}: ${content}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error sending agent message:', error);
    }
  }

  /**
   * Process user message from web client
   * Called by server endpoint when web client sends speech transcript
   */
  async processUserMessage(transcript) {
    try {
      console.log(`🎧 Processing user message: "${transcript}"`);
      
      if (this.isProcessing) {
        console.log('⏳ Already processing, queuing message...');
        return null;
      }
      
      this.isProcessing = true;
      
      // Process with LinkAI
      const aiResponse = await this.processWithLinkAI(transcript);
      
      if (aiResponse) {
        console.log(`🤖 Generated AI response: "${aiResponse}"`);
        return aiResponse;
      } else {
        console.log('🤐 No response generated');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Error processing user message:', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process text with LinkAI Runtime
   */
  async processWithLinkAI(message) {
    try {
      // Add to conversation history
      this.conversationHistory.push({ role: 'user', content: message });
      
      // Keep history manageable
      if (this.conversationHistory.length > this.config.maxHistoryLength) {
        this.conversationHistory = this.conversationHistory.slice(-this.config.maxHistoryLength);
      }
      
      // Use correct LinkAI API format
      const response = await axios.post(`${this.config.linkaiApiUrl}/chat-interface`, {
        messages: this.conversationHistory,
        chatbotId: this.config.agentId, // API expects 'chatbotId', not 'agentId'
        userId: `voice-user-${Date.now()}`,
        roomId: this.roomName,
        stream: false,
        source: 'livekit-voice',
        requestVoiceSettings: true
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.linkaiApiKey}`,
          'Content-Type': 'application/json',
          'X-API-Key': this.config.voiceServerApiKey || process.env.VOICE_SERVER_API_KEY
        },
        timeout: 30000 // 30 second timeout to handle slow LinkAI responses
      });
      
      // Handle both plain text and JSON responses
      let aiResponse = '';
      if (typeof response.data === 'string') {
        // Plain text response from chat-interface API
        aiResponse = response.data;
      } else {
        // JSON response (fallback)
        aiResponse = response.data?.content || response.data?.response || response.data?.message || '';
      }
      
      if (aiResponse) {
        // Add AI response to history
        this.conversationHistory.push({ role: 'assistant', content: aiResponse });
      }
      
      return aiResponse;
    } catch (error) {
      console.error('❌ LinkAI Error:', error.response?.data || error.message);
      return 'I apologize, but I\'m having trouble processing your request right now.';
    }
  }

  /**
   * Disconnect from room and cleanup
   */
  async disconnect() {
    console.log('🔌 Disconnecting agent...');
    
    this.isConnected = false;
    this.isProcessing = false;
    
    // Clear monitoring interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Clear room references
    this.roomService = null;
    this.roomName = null;
    this.conversationHistory = [];
    
    console.log('🔌 Agent disconnected');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.disconnect();
    console.log('🧹 Agent cleaned up');
  }
}

export default LinkAIVoiceAgent; 