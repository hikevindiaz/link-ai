// WebRTC-based Realtime API Session Manager
// Following OpenAI's recommended approach for client-side applications

export type RealtimeConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'error' 
  | 'reconnecting';

export type RealtimeSessionState = 
  | 'idle' 
  | 'listening' 
  | 'thinking' 
  | 'speaking' 
  | 'user_speaking';

export interface RealtimeEvent {
  type: string;
  [key: string]: any;
}

export interface WebRTCSessionManager {
  // Connection state
  connectionState: RealtimeConnectionState;
  sessionState: RealtimeSessionState;
  
  // WebRTC connection
  connect(ephemeralToken: string, audioElement: HTMLAudioElement): Promise<void>;
  disconnect(): void;
  
  // Session management
  updateSession(config: any): void;
  
  // Communication
  sendEvent(event: any): void;
  
  // Event handling
  onEvent(callback: (event: RealtimeEvent) => void): void;
  onStateChange(callback: (state: RealtimeSessionState) => void): void;
  onConnectionChange(callback: (state: RealtimeConnectionState) => void): void;
  
  // Status checks
  isResponseActive(): boolean;
  
  // Cleanup
  cleanup(): void;
}

export class WebRTCRealtimeSessionManager implements WebRTCSessionManager {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  
  private eventCallbacks: ((event: RealtimeEvent) => void)[] = [];
  private stateCallbacks: ((state: RealtimeSessionState) => void)[] = [];
  private connectionCallbacks: ((state: RealtimeConnectionState) => void)[] = [];
  
  public connectionState: RealtimeConnectionState = 'disconnected';
  public sessionState: RealtimeSessionState = 'idle';
  
  // Track if we're currently in a response to prevent overlapping
  private isInResponse: boolean = false;
  private responseAudioFinished: boolean = false;
  private currentResponseId: string | null = null;
  
  async connect(ephemeralToken: string, audioElement: HTMLAudioElement): Promise<void> {
    if (this.pc) {
      console.log('[WebRTC Realtime] Already connected');
      return;
    }
    
    this.setConnectionState('connecting');
    this.audioElement = audioElement;
    
    try {
      // Create peer connection
      this.pc = new RTCPeerConnection();
      
      // Handle incoming audio
      this.pc.ontrack = (e) => {
        console.log('[WebRTC Realtime] Received audio track');
        if (this.audioElement) {
          this.audioElement.srcObject = e.streams[0];
        }
      };
      
      // Get user media and add track
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log('[WebRTC Realtime] Got user media');
      const audioTrack = stream.getAudioTracks()[0];
      this.pc.addTrack(audioTrack, stream);
      
      // Create data channel for events
      this.dc = this.pc.createDataChannel('oai-events');
      
      this.dc.addEventListener('open', () => {
        console.log('[WebRTC Realtime] Data channel opened');
        this.setConnectionState('connected');
      });
      
      this.dc.addEventListener('message', (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data);
          this.handleServerEvent(event);
        } catch (error) {
          console.error('[WebRTC Realtime] Error parsing message:', error);
        }
      });
      
      this.dc.addEventListener('close', () => {
        console.log('[WebRTC Realtime] Data channel closed');
      });
      
      this.dc.addEventListener('error', (error) => {
        console.error('[WebRTC Realtime] Data channel error:', error);
      });
      
      // Create offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      
      // Send offer to OpenAI
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      
      const response = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Authorization': `Bearer ${ephemeralToken}`,
          'Content-Type': 'application/sdp',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const answerSdp = await response.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp,
      };
      
      await this.pc.setRemoteDescription(answer);
      console.log('[WebRTC Realtime] Connection established');
      
    } catch (error) {
      console.error('[WebRTC Realtime] Connection failed:', error);
      this.setConnectionState('error');
      throw error;
    }
  }
  
  disconnect(): void {
    console.log('[WebRTC Realtime] Disconnecting');
    
    if (this.pc) {
      // Stop all tracks
      this.pc.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      
      this.pc.close();
      this.pc = null;
    }
    
    this.dc = null;
    this.audioElement = null;
    
    this.setConnectionState('disconnected');
    this.setSessionState('idle');
  }
  
  updateSession(config: any): void {
    const event = {
      type: 'session.update',
      session: config
    };
    this.sendEvent(event);
  }
  
  sendEvent(event: any): void {
    if (this.dc && this.dc.readyState === 'open') {
      // Check if trying to create a new response while one is active
      if (event.type === 'response.create' && this.isInResponse) {
        console.warn('[WebRTC Realtime] Skipping response.create - response already active');
        return;
      }
      
      this.dc.send(JSON.stringify(event));
      console.log('[WebRTC Realtime] Sent event:', event.type);
    } else {
      console.warn('[WebRTC Realtime] Cannot send event - data channel not ready');
    }
  }
  
  onEvent(callback: (event: RealtimeEvent) => void): void {
    this.eventCallbacks.push(callback);
  }
  
  onStateChange(callback: (state: RealtimeSessionState) => void): void {
    this.stateCallbacks.push(callback);
  }
  
  onConnectionChange(callback: (state: RealtimeConnectionState) => void): void {
    this.connectionCallbacks.push(callback);
  }
  
  isResponseActive(): boolean {
    return this.isInResponse;
  }
  
  cleanup(): void {
    console.log('[WebRTC Realtime] Cleaning up');
    this.disconnect();
    this.eventCallbacks = [];
    this.stateCallbacks = [];
    this.connectionCallbacks = [];
  }
  
  private handleServerEvent(event: RealtimeEvent): void {
    console.log('[WebRTC Realtime] Received event:', event.type);
    
    // Update session state based on events
    this.updateSessionStateFromEvent(event);
    
    // Notify callbacks
    this.eventCallbacks.forEach(callback => callback(event));
  }
  
  private updateSessionStateFromEvent(event: RealtimeEvent): void {
    switch (event.type) {
      case 'session.created':
        this.setSessionState('listening');
        break;
        
      case 'input_audio_buffer.speech_started':
        // User started speaking - interrupt any ongoing response
        if (this.isInResponse) {
          console.log('[WebRTC Realtime] User interrupted - stopping response');
          this.sendEvent({ type: 'response.cancel' });
          this.isInResponse = false;
          this.currentResponseId = null;
        }
        this.setSessionState('user_speaking');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        // Only go to thinking if we're not already in a response
        if (!this.isInResponse) {
          this.setSessionState('thinking');
        }
        break;
        
      case 'response.created':
        this.isInResponse = true;
        this.responseAudioFinished = false;
        this.currentResponseId = event.response?.id || null;
        this.setSessionState('thinking');
        break;
        
      case 'response.audio.delta':
      case 'response.audio_transcript.delta':
        // Only set to speaking if we're in the current response
        if (this.isInResponse && (!event.response_id || event.response_id === this.currentResponseId)) {
          this.setSessionState('speaking');
        }
        break;
        
      case 'response.audio.done':
      case 'output_audio_buffer.stopped':
        // Audio playback is complete
        this.responseAudioFinished = true;
        console.log('[WebRTC Realtime] Audio playback complete');
        break;
        
      case 'response.done':
        // Response is done - but don't immediately go to listening if audio is still playing
        if (event.response?.id === this.currentResponseId) {
          this.isInResponse = false;
          this.currentResponseId = null;
          
          // Only go back to listening if audio is done or we don't have audio
          if (this.responseAudioFinished || !event.response?.output?.some((item: any) => item.type === 'audio')) {
            this.setSessionState('listening');
          } else {
            // Keep in speaking state until audio is done
            console.log('[WebRTC Realtime] Response done but audio still playing');
          }
        }
        break;
        
      case 'response.canceled':
        // Response was canceled (likely due to interruption)
        if (event.response_id === this.currentResponseId) {
          this.isInResponse = false;
          this.currentResponseId = null;
          this.setSessionState('listening');
        }
        break;
        
      case 'rate_limits.updated':
        // Ignore rate limit updates - they don't affect session state
        break;
    }
  }
  
  private setConnectionState(state: RealtimeConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      console.log('[WebRTC Realtime] Connection state:', state);
      this.connectionCallbacks.forEach(callback => callback(state));
    }
  }
  
  private setSessionState(state: RealtimeSessionState): void {
    if (this.sessionState !== state) {
      this.sessionState = state;
      console.log('[WebRTC Realtime] Session state:', state);
      this.stateCallbacks.forEach(callback => callback(state));
    }
  }
}

// Factory function
export function createWebRTCRealtimeSession(): WebRTCSessionManager {
  return new WebRTCRealtimeSessionManager();
} 