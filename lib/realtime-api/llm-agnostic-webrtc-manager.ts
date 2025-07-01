import { logger } from '@/lib/logger';

export interface LLMAgnosticWebRTCManager {
  connect(chatbotId: string, audioElement: HTMLAudioElement): Promise<void>;
  disconnect(): void;
  sendText(text: string): void;
  onConnectionChange(callback: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void): void;
  onStateChange(callback: (state: 'idle' | 'listening' | 'processing' | 'speaking') => void): void;
  onTranscript(callback: (transcript: string, isFinal: boolean) => void): void;
  onAudio(callback: (audioLevel: number) => void): void;
  updateSession(config: any): void;
}

export interface RealtimeConnectionState {
  type: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface RealtimeSessionState {
  type: 'idle' | 'listening' | 'processing' | 'speaking';
}

export interface RealtimeEvent {
  type: string;
  [key: string]: any;
}

export class LLMAgnosticWebRTCSessionManager implements LLMAgnosticWebRTCManager {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isRecording = false;
  private isProcessing = false;
  private chatbotId: string | null = null;
  private sessionConfig: any = null;
  
  private connectionCallbacks: ((state: 'disconnected' | 'connecting' | 'connected' | 'error') => void)[] = [];
  private stateCallbacks: ((state: 'idle' | 'listening' | 'processing' | 'speaking') => void)[] = [];
  private transcriptCallbacks: ((transcript: string, isFinal: boolean) => void)[] = [];
  private audioCallbacks: ((audioLevel: number) => void)[] = [];
  
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private sessionState: 'idle' | 'listening' | 'processing' | 'speaking' = 'idle';
  
  private audioChunks: Blob[] = [];
  private silenceTimer: NodeJS.Timeout | null = null;
  private audioLevelInterval: NodeJS.Timeout | null = null;
  private analyser: AnalyserNode | null = null;
  
  async connect(chatbotId: string, audioElement: HTMLAudioElement): Promise<void> {
    if (this.connectionState === 'connected') {
      console.log('[LLM-Agnostic WebRTC] Already connected');
      return;
    }
    
    this.setConnectionState('connecting');
    this.audioElement = audioElement;
    this.chatbotId = chatbotId;
    
    try {
      console.log('[LLM-Agnostic WebRTC] Initializing session');
      
      // Get session configuration from server
      const response = await fetch('/api/voice/llm-agnostic-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatbotId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      this.sessionConfig = await response.json();
      console.log('[LLM-Agnostic WebRTC] Session config received:', this.sessionConfig);
      
      // Initialize audio context and media recorder
      await this.initializeAudio();
      
      this.setConnectionState('connected');
      this.setSessionState('idle');
      
      console.log('[LLM-Agnostic WebRTC] Connection established');
      
    } catch (error) {
      console.error('[LLM-Agnostic WebRTC] Connection failed:', error);
      this.setConnectionState('error');
      throw error;
    }
  }
  
  private async initializeAudio(): Promise<void> {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      // Create audio context for analysis
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.processAudioChunks();
      };
      
      // Start audio level monitoring
      this.startAudioLevelMonitoring();
      
      // Start listening
      this.startListening();
      
    } catch (error) {
      console.error('[LLM-Agnostic WebRTC] Error initializing audio:', error);
      throw error;
    }
  }
  
  private startListening(): void {
    if (!this.mediaRecorder || this.isRecording) return;
    
    console.log('[LLM-Agnostic WebRTC] Starting to listen');
    this.setSessionState('listening');
    this.isRecording = true;
    this.audioChunks = [];
    
    this.mediaRecorder.start(100); // Collect data every 100ms
    
    // Set silence detection
    this.resetSilenceTimer();
  }
  
  private stopListening(): void {
    if (!this.mediaRecorder || !this.isRecording) return;
    
    console.log('[LLM-Agnostic WebRTC] Stopping listening');
    this.isRecording = false;
    this.mediaRecorder.stop();
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
  
  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    
    this.silenceTimer = setTimeout(() => {
      if (this.isRecording && this.audioChunks.length > 0) {
        this.stopListening();
      }
    }, 1500); // 1.5 seconds of silence
  }
  
  private startAudioLevelMonitoring(): void {
    if (!this.analyser) return;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    this.audioLevelInterval = setInterval(() => {
      if (!this.analyser) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS audio level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const audioLevel = rms / 255; // Normalize to 0-1
      
      // Notify callbacks
      this.audioCallbacks.forEach(callback => callback(audioLevel));
      
      // Reset silence timer if there's audio activity
      if (audioLevel > 0.01 && this.isRecording) { // Threshold for voice activity
        this.resetSilenceTimer();
      }
      
    }, 50); // Update every 50ms
  }
  
  private async processAudioChunks(): Promise<void> {
    if (this.audioChunks.length === 0 || this.isProcessing) return;
    
    this.isProcessing = true;
    this.setSessionState('processing');
    
    try {
      console.log('[LLM-Agnostic WebRTC] Processing audio chunks');
      
      // Combine audio chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
      this.audioChunks = [];
      
      // Convert to format suitable for transcription
      const audioBuffer = await this.convertAudioForTranscription(audioBlob);
      
      // Step 1: Speech-to-Text
      const transcript = await this.transcribeAudio(audioBuffer);
      
      if (!transcript || transcript.trim().length === 0) {
        console.log('[LLM-Agnostic WebRTC] No transcript generated');
        this.isProcessing = false;
        this.setSessionState('idle');
        this.startListening(); // Resume listening
        return;
      }
      
      console.log('[LLM-Agnostic WebRTC] Transcript:', transcript);
      
      // Notify transcript callbacks
      this.transcriptCallbacks.forEach(callback => callback(transcript, true));
      
      // Step 2: Generate AI response
      const aiResponse = await this.generateAIResponse(transcript);
      
      if (!aiResponse) {
        console.error('[LLM-Agnostic WebRTC] No AI response generated');
        this.isProcessing = false;
        this.setSessionState('idle');
        this.startListening();
        return;
      }
      
      console.log('[LLM-Agnostic WebRTC] AI Response:', aiResponse);
      
      // Step 3: Text-to-Speech and play audio
      await this.generateAndPlayAudio(aiResponse);
      
    } catch (error) {
      console.error('[LLM-Agnostic WebRTC] Error processing audio:', error);
    } finally {
      this.isProcessing = false;
      this.setSessionState('idle');
      // Resume listening after processing
      setTimeout(() => this.startListening(), 500);
    }
  }
  
  private async convertAudioForTranscription(audioBlob: Blob): Promise<ArrayBuffer> {
    // Convert WebM/Opus to format suitable for transcription
    // For now, we'll use the blob directly - you might need audio conversion libraries
    return await audioBlob.arrayBuffer();
  }
  
  private async transcribeAudio(audioBuffer: ArrayBuffer): Promise<string | null> {
    try {
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('chatbotId', this.chatbotId!);
      
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.transcript;
      
    } catch (error) {
      console.error('[LLM-Agnostic WebRTC] Transcription error:', error);
      return null;
    }
  }
  
  private async generateAIResponse(transcript: string): Promise<string | null> {
    try {
      const response = await fetch('/api/voice/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotId: this.chatbotId,
          message: transcript,
          sessionConfig: this.sessionConfig
        })
      });
      
      if (!response.ok) {
        throw new Error(`AI response failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.response;
      
    } catch (error) {
      console.error('[LLM-Agnostic WebRTC] AI response error:', error);
      return null;
    }
  }
  
  private async generateAndPlayAudio(text: string): Promise<void> {
    try {
      this.setSessionState('speaking');
      
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          chatbotId: this.chatbotId,
          sessionConfig: this.sessionConfig
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS failed: ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (this.audioElement) {
        this.audioElement.src = audioUrl;
        
        // Wait for audio to finish playing
        await new Promise<void>((resolve) => {
          const onEnded = () => {
            this.audioElement?.removeEventListener('ended', onEnded);
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          this.audioElement?.addEventListener('ended', onEnded);
          this.audioElement?.play().catch(console.error);
        });
      }
      
    } catch (error) {
      console.error('[LLM-Agnostic WebRTC] TTS error:', error);
    }
  }
  
  disconnect(): void {
    console.log('[LLM-Agnostic WebRTC] Disconnecting');
    
    this.setConnectionState('disconnected');
    this.setSessionState('idle');
    
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
    
    this.isRecording = false;
    this.isProcessing = false;
    this.mediaRecorder = null;
    this.analyser = null;
    this.audioElement = null;
    this.chatbotId = null;
    this.sessionConfig = null;
  }
  
  sendText(text: string): void {
    if (this.connectionState !== 'connected') {
      console.warn('[LLM-Agnostic WebRTC] Cannot send text - not connected');
      return;
    }
    
    // Generate and play audio for the text
    this.generateAndPlayAudio(text).catch(console.error);
  }
  
  updateSession(config: any): void {
    this.sessionConfig = { ...this.sessionConfig, ...config };
    console.log('[LLM-Agnostic WebRTC] Session updated:', this.sessionConfig);
  }
  
  onConnectionChange(callback: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void): void {
    this.connectionCallbacks.push(callback);
  }
  
  onStateChange(callback: (state: 'idle' | 'listening' | 'processing' | 'speaking') => void): void {
    this.stateCallbacks.push(callback);
  }
  
  onTranscript(callback: (transcript: string, isFinal: boolean) => void): void {
    this.transcriptCallbacks.push(callback);
  }
  
  onAudio(callback: (audioLevel: number) => void): void {
    this.audioCallbacks.push(callback);
  }
  
  private setConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'error'): void {
    this.connectionState = state;
    this.connectionCallbacks.forEach(callback => callback(state));
  }
  
  private setSessionState(state: 'idle' | 'listening' | 'processing' | 'speaking'): void {
    this.sessionState = state;
    this.stateCallbacks.forEach(callback => callback(state));
  }
}

export function createLLMAgnosticWebRTCSession(): LLMAgnosticWebRTCManager {
  return new LLMAgnosticWebRTCSessionManager();
} 