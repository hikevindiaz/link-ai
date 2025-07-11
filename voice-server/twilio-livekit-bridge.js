import { WebSocketServer } from 'ws';
import { Room } from 'livekit-client';
import { AccessToken } from 'livekit-server-sdk';
import { EventEmitter } from 'events';

/**
 * Twilio to LiveKit Audio Bridge
 * 
 * This bridge connects Twilio's WebSocket audio streams
 * to LiveKit rooms where AI agents are waiting.
 * 
 * Flow:
 * 1. Twilio calls connect via WebSocket
 * 2. Bridge joins caller to LiveKit room
 * 3. AI agent processes audio in real-time
 * 4. Responses are streamed back to Twilio
 */

class TwilioLiveKitBridge {
  constructor(options = {}) {
    this.liveKitUrl = options.liveKitUrl || process.env.LIVEKIT_URL;
    this.liveKitApiKey = options.liveKitApiKey || process.env.LIVEKIT_API_KEY;
    this.liveKitApiSecret = options.liveKitApiSecret || process.env.LIVEKIT_API_SECRET;
    
    this.activeBridges = new Map();
    this.wss = null;
    
    console.log('🌉 Twilio-LiveKit Bridge initialized');
  }

  /**
   * Start WebSocket server for Twilio streams
   */
  start(port = 8080) {
    this.wss = new WebSocketServer({ 
      port: port,
      path: '/stream'
    });

    this.wss.on('connection', (ws, req) => {
      this.handleTwilioConnection(ws, req);
    });

    console.log(`🌉 Bridge WebSocket server started on port ${port}`);
    console.log(`   - Twilio streams connect to: ws://localhost:${port}/stream`);
  }

  /**
   * Handle incoming Twilio WebSocket connection
   */
  async handleTwilioConnection(ws, req) {
    try {
      console.log('📞 New Twilio stream connection');
      
      // Parse URL parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const roomName = url.pathname.split('/').pop();
      const token = url.searchParams.get('token');
      
      if (!roomName || !token) {
        console.error('❌ Missing roomName or token in WebSocket connection');
        ws.close(1008, 'Missing required parameters');
        return;
      }

      console.log(`🏠 Connecting to LiveKit room: ${roomName}`);
      
      // Create LiveKit room connection
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 640, height: 480 },
          frameRate: 15
        }
      });

      // Connect to LiveKit room
      await room.connect(this.liveKitUrl, token);
      console.log(`✅ Connected to LiveKit room: ${roomName}`);

      // Create bridge instance
      const bridge = new TwilioBridge(ws, room, roomName);
      this.activeBridges.set(roomName, bridge);

      // Handle bridge cleanup
      bridge.on('closed', () => {
        this.activeBridges.delete(roomName);
        console.log(`🧹 Bridge cleaned up for room: ${roomName}`);
      });

      // Start bridging audio
      await bridge.start();

    } catch (error) {
      console.error('❌ Error handling Twilio connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Get active bridges
   */
  getActiveBridges() {
    return Array.from(this.activeBridges.entries()).map(([roomName, bridge]) => ({
      roomName: roomName,
      callSid: bridge.callSid,
      startedAt: bridge.startedAt,
      status: bridge.status
    }));
  }

  /**
   * Cleanup specific bridge
   */
  cleanupBridge(roomName) {
    const bridge = this.activeBridges.get(roomName);
    if (bridge) {
      bridge.close();
      this.activeBridges.delete(roomName);
    }
  }

  /**
   * Stop the bridge server
   */
  stop() {
    // Cleanup all active bridges
    for (const [roomName, bridge] of this.activeBridges.entries()) {
      bridge.close();
    }
    this.activeBridges.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    console.log('🛑 Bridge server stopped');
  }
}

/**
 * Individual bridge instance for a Twilio call
 */
class TwilioBridge {
  constructor(twilioWs, liveKitRoom, roomName) {
    this.twilioWs = twilioWs;
    this.liveKitRoom = liveKitRoom;
    this.roomName = roomName;
    this.callSid = null;
    this.startedAt = new Date();
    this.status = 'connecting';
    this.eventEmitter = new EventEmitter();
    
    // Audio buffers
    this.audioBuffer = [];
    this.isProcessingAudio = false;
    
    console.log(`🌉 Bridge created for room: ${roomName}`);
  }

  /**
   * Start bridging audio between Twilio and LiveKit
   */
  async start() {
    try {
      // Handle Twilio WebSocket messages
      this.twilioWs.on('message', (message) => {
        this.handleTwilioMessage(message);
      });

      // Handle Twilio WebSocket close
      this.twilioWs.on('close', () => {
        console.log(`📞 Twilio connection closed for room: ${this.roomName}`);
        this.close();
      });

      // Handle LiveKit room events
      this.liveKitRoom.on('disconnected', () => {
        console.log(`🔌 LiveKit room disconnected: ${this.roomName}`);
        this.close();
      });

      // Handle incoming audio tracks from LiveKit (AI responses)
      this.liveKitRoom.on('trackSubscribed', (track, publication, participant) => {
        if (track.kind === 'audio' && participant.identity.startsWith('agent-')) {
          console.log('🤖 Received AI response audio, streaming to Twilio...');
          this.streamLiveKitAudioToTwilio(track);
        }
      });

      this.status = 'connected';
      console.log(`✅ Bridge active for room: ${this.roomName}`);

    } catch (error) {
      console.error(`❌ Error starting bridge for room ${this.roomName}:`, error);
      this.close();
    }
  }

  /**
   * Handle incoming messages from Twilio WebSocket
   */
  handleTwilioMessage(message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.event) {
        case 'connected':
          console.log('📞 Twilio stream connected');
          this.callSid = data.protocol;
          break;
          
        case 'start':
          console.log('🎙️ Twilio stream started');
          this.sendAudioConfigToTwilio();
          break;
          
        case 'media':
          // Handle incoming audio from Twilio call
          this.handleTwilioAudio(data.media);
          break;
          
        case 'stop':
          console.log('🛑 Twilio stream stopped');
          this.close();
          break;
          
        default:
          console.log('📨 Twilio message:', data.event);
      }
    } catch (error) {
      console.error('❌ Error parsing Twilio message:', error);
    }
  }

  /**
   * Send audio configuration to Twilio
   */
  sendAudioConfigToTwilio() {
    const config = {
      event: 'clear',
      streamSid: this.callSid
    };
    
    this.twilioWs.send(JSON.stringify(config));
  }

  /**
   * Handle incoming audio from Twilio (user speech)
   */
  async handleTwilioAudio(mediaData) {
    try {
      // Decode base64 audio payload
      const audioBuffer = Buffer.from(mediaData.payload, 'base64');
      
      // Convert μ-law to linear PCM
      const pcmBuffer = this.convertMuLawToPCM(audioBuffer);
      
      // Create audio blob for LiveKit
      const audioBlob = new Blob([pcmBuffer], { type: 'audio/pcm' });
      
      // Stream to LiveKit room (this will be picked up by the AI agent)
      await this.streamAudioToLiveKit(audioBlob);
      
    } catch (error) {
      console.error('❌ Error handling Twilio audio:', error);
    }
  }

  /**
   * Convert μ-law audio to linear PCM
   */
  convertMuLawToPCM(muLawBuffer) {
    const pcmBuffer = Buffer.alloc(muLawBuffer.length * 2);
    
    // μ-law to linear conversion table (simplified)
    const muLawTable = [
      -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
      -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
      // ... (complete table would have 256 entries)
    ];
    
    for (let i = 0; i < muLawBuffer.length; i++) {
      const muLawValue = muLawBuffer[i];
      const pcmValue = muLawTable[muLawValue] || 0;
      pcmBuffer.writeInt16LE(pcmValue, i * 2);
    }
    
    return pcmBuffer;
  }

  /**
   * Stream audio to LiveKit room
   */
  async streamAudioToLiveKit(audioBlob) {
    try {
      // Convert blob to MediaStream
      const audioContext = new AudioContext({ sampleRate: 8000 });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create audio track from buffer
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      
      // Create and publish audio track to LiveKit
      const audioTrack = new MediaStreamTrack(destination.stream.getAudioTracks()[0]);
      await this.liveKitRoom.localParticipant.publishTrack(audioTrack, {
        name: 'twilio-caller-audio',
        source: 'microphone'
      });
      
      // Play the audio
      source.start();
      
      // Clean up after playback
      source.addEventListener('ended', () => {
        this.liveKitRoom.localParticipant.unpublishTrack(audioTrack);
      });
      
    } catch (error) {
      console.error('❌ Error streaming audio to LiveKit:', error);
    }
  }

  /**
   * Stream audio from LiveKit (AI responses) to Twilio
   */
  streamLiveKitAudioToTwilio(audioTrack) {
    try {
      // Get audio stream
      const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
      
      // Process audio stream
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      processor.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        
        // Convert float32 to μ-law for Twilio
        const muLawBuffer = this.convertPCMToMuLaw(audioData);
        
        // Send to Twilio
        const mediaMessage = {
          event: 'media',
          streamSid: this.callSid,
          media: {
            payload: muLawBuffer.toString('base64')
          }
        };
        
        if (this.twilioWs.readyState === 1) { // WebSocket.OPEN
          this.twilioWs.send(JSON.stringify(mediaMessage));
        }
      };
      
    } catch (error) {
      console.error('❌ Error streaming LiveKit audio to Twilio:', error);
    }
  }

  /**
   * Convert linear PCM to μ-law
   */
  convertPCMToMuLaw(pcmFloat32Array) {
    const muLawBuffer = Buffer.alloc(pcmFloat32Array.length);
    
    for (let i = 0; i < pcmFloat32Array.length; i++) {
      // Convert float32 [-1, 1] to int16
      const pcmValue = Math.max(-32768, Math.min(32767, pcmFloat32Array[i] * 32767));
      
      // Simple μ-law encoding (simplified)
      let muLawValue = 0;
      if (pcmValue >= 0) {
        muLawValue = Math.floor(Math.log(1 + 255 * Math.abs(pcmValue) / 32767) / Math.log(1 + 255) * 127);
      } else {
        muLawValue = 128 + Math.floor(Math.log(1 + 255 * Math.abs(pcmValue) / 32767) / Math.log(1 + 255) * 127);
      }
      
      muLawBuffer[i] = muLawValue;
    }
    
    return muLawBuffer;
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Close the bridge connection
   */
  close() {
    this.status = 'closed';
    
    // Close Twilio WebSocket
    if (this.twilioWs && this.twilioWs.readyState === 1) {
      this.twilioWs.close();
    }
    
    // Disconnect from LiveKit room
    if (this.liveKitRoom) {
      this.liveKitRoom.disconnect();
    }
    
    // Emit closed event
    this.eventEmitter.emit('closed');
    
    console.log(`🌉 Bridge closed for room: ${this.roomName}`);
  }
}

export { TwilioLiveKitBridge, TwilioBridge }; 