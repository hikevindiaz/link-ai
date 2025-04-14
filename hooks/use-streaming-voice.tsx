'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import useSWR from 'swr';

// Custom console logging for debugging
const debugLog = (message: string, data?: any) => {
  console.log(`[StreamingVoice] ${message}`, data || '');
};

const sanitizeUrlForDisplay = (url: string) => {
  if (!url) return '';
  return url.replace(/api_key=([^&]*)/, 'api_key=***');
};

// Define fetcher inline for API calls
const fetcher = async (url: string) => {
  const response = await fetch(url);
  return response.json();
};

// Voice interface states
export type VoiceState = 
  | 'idle'        // Initial state, no active session
  | 'connecting'  // Setting up WebSockets and API connections
  | 'listening'   // Capturing and streaming user audio
  | 'processing'  // Processing partial transcripts with LLM
  | 'speaking'    // Playing TTS response (may overlap with listening for barge-in)
  | 'error';      // Error state

// Streaming voice interface props
export interface StreamingVoiceProps {
  chatbotId?: string;
  voiceId?: string;
  welcomeMessage?: string;
  onPartialTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
  onAudioLevelChange?: (level: number) => void;
  allowBargeIn?: boolean; // Whether to allow interrupting system speech
}

// Return type for the hook
export interface StreamingVoiceReturn {
  state: VoiceState;
  isLoading: boolean;
  startSession: () => void;
  stopSession: () => void;
  userTranscript: string;
  partialResponse: string;
  audioLevel: number;
  isSpeaking: boolean;
  isUserSpeaking: boolean;
}

// Advanced streaming voice hook with real-time processing
export function useStreamingVoice({
  chatbotId,
  voiceId = '21m00Tcm4TlvDq8ikWAM', // Default voice ID
  welcomeMessage,
  onPartialTranscript,
  onError,
  onAudioLevelChange,
  allowBargeIn = true,
}: StreamingVoiceProps): StreamingVoiceReturn {
  // Core state
  const [state, setState] = useState<VoiceState>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [partialResponse, setPartialResponse] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  // WebSocket references
  const sttWebSocketRef = useRef<WebSocket | null>(null);
  const ttsWebSocketRef = useRef<WebSocket | null>(null);
  
  // Audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioNodeRef = useRef<AudioNode | null>(null);
  
  // Fetch credentials (only when needed)
  const { data: credentials, error: credentialsError, isLoading } = useSWR(
    state !== 'idle' ? '/api/voice/credentials' : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // Initialize audio context (only once)
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Failed to initialize AudioContext:", e);
        if (onError) onError("Your browser doesn't support audio processing");
      }
    }
    
    return () => {
      // Cleanup on unmount
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [onError]);

  // Clean up all connections
  const cleanupConnections = useCallback(() => {
    // Close WebSockets
    if (sttWebSocketRef.current) {
      sttWebSocketRef.current.close();
      sttWebSocketRef.current = null;
    }
    
    if (ttsWebSocketRef.current) {
      ttsWebSocketRef.current.close();
      ttsWebSocketRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset state
    setIsSpeaking(false);
    setIsUserSpeaking(false);
    setUserTranscript('');
    setPartialResponse('');
  }, []);

  // Send text to TTS for speaking
  const sendTextToSpeak = useCallback((text: string) => {
    if (!text.trim() || !ttsWebSocketRef.current || ttsWebSocketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Set speaking state
    setState('speaking');
    setIsSpeaking(true);
    
    // Send text to TTS WebSocket for streaming synthesis
    ttsWebSocketRef.current.send(JSON.stringify({
      type: 'text',
      text: text
    }));
  }, []);

  // Stop speaking (for barge-in)
  const stopSpeaking = useCallback(() => {
    if (ttsWebSocketRef.current?.readyState === WebSocket.OPEN) {
      ttsWebSocketRef.current.send(JSON.stringify({
        type: 'stop'
      }));
    }
    
    setIsSpeaking(false);
    setState('listening');
  }, []);

  // Play audio chunk from TTS
  const playAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (!audioContextRef.current) return;
    
    try {
      // Convert blob to audio buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Create source node and play audio
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
      
      // Handle barge-in if enabled
      if (allowBargeIn && isUserSpeaking) {
        // If user is speaking while system is speaking, stop TTS
        stopSpeaking();
      }
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  }, [allowBargeIn, isUserSpeaking, stopSpeaking]);

  // Process partial transcript with LLM (streaming)
  const processPartialTranscript = useCallback((text: string) => {
    // Skip if empty or very short
    if (!text.trim() || text.length < 5) return;
    
    // Start processing partial transcript in background
    // This would call your API endpoint that streams tokens from the LLM
    const processStream = async () => {
      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            chatbotId,
            partial: true
          })
        });
        
        // Handle streaming response
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let partialText = '';
          
          // Process chunks as they arrive
          let { done, value } = await reader.read();
          while (!done) {
            const chunk = decoder.decode(value, { stream: true });
            partialText += chunk;
            
            // Update partial response state
            setPartialResponse(partialText);
            
            // Get next chunk
            ({ done, value } = await reader.read());
          }
        }
      } catch (e) {
        console.error("Error processing partial transcript:", e);
      }
    };
    
    // Start processing in background
    processStream();
  }, [chatbotId]);

  // Process complete transcript with LLM and generate response
  const processCompleteTranscript = useCallback((text: string) => {
    // Skip if empty
    if (!text.trim()) {
      setState('listening');
      return;
    }
    
    setState('processing');
    
    // Process complete transcript and get streaming response
    const processStream = async () => {
      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            chatbotId,
            partial: false
          })
        });
        
        // Handle streaming response
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let responseText = '';
          let currentSentence = '';
          
          // Process chunks as they arrive
          let { done, value } = await reader.read();
          while (!done) {
            const chunk = decoder.decode(value, { stream: true });
            responseText += chunk;
            currentSentence += chunk;
            
            // Update response state
            setPartialResponse(responseText);
            
            // Check if we have a sentence to send to TTS
            if (/[.!?]\s*$/.test(currentSentence) || currentSentence.length > 100) {
              // Send complete sentence to TTS
              sendTextToSpeak(currentSentence);
              currentSentence = '';
            }
            
            // Get next chunk
            ({ done, value } = await reader.read());
          }
          
          // Send any remaining text
          if (currentSentence.trim()) {
            sendTextToSpeak(currentSentence);
          }
          
          // Transition state if needed
          if (state === 'processing') {
            setState('speaking');
          }
        }
      } catch (e) {
        console.error("Error processing complete transcript:", e);
        if (onError) onError("Failed to process your request");
        setState('listening');
      }
    };
    
    // Start processing
    processStream();
  }, [chatbotId, onError, state, sendTextToSpeak]);

  // Set up Speech-to-Text WebSocket
  const setupSTTWebSocket = useCallback(() => {
    if (!credentials) return;
    
    try {
      // Close existing connection if any
      sttWebSocketRef.current?.close();
      
      // Create new WebSocket connection for streaming audio to OpenAI
      sttWebSocketRef.current = new WebSocket(credentials.sttEndpoint);
      
      sttWebSocketRef.current.onopen = () => {
        debugLog("STT WebSocket connected");
        // Send configuration message
        if (sttWebSocketRef.current?.readyState === WebSocket.OPEN) {
          sttWebSocketRef.current.send(JSON.stringify({
            type: 'config',
            model: 'whisper-1',
            language: 'en',
            // Enable partial results for faster processing
            partial_results: true
          }));
        }
      };
      
      sttWebSocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle partial transcripts
          if (data.type === 'partial_transcript') {
            setUserTranscript(data.text);
            if (onPartialTranscript) onPartialTranscript(data.text, false);
            
            // Start LLM processing with partial transcript
            if (data.text.trim().length > 10) {
              processPartialTranscript(data.text);
            }
          }
          
          // Handle final transcripts
          if (data.type === 'final_transcript') {
            setUserTranscript(data.text);
            if (onPartialTranscript) onPartialTranscript(data.text, true);
            setState('processing');
            
            // Process final transcript with LLM
            processCompleteTranscript(data.text);
          }
        } catch (e) {
          console.error("Error parsing STT WebSocket message:", e);
        }
      };
      
      sttWebSocketRef.current.onerror = (error) => {
        debugLog("STT WebSocket error", error);
        if (onError) onError("Speech recognition error");
      };
      
      sttWebSocketRef.current.onclose = () => {
        debugLog("STT WebSocket closed");
      };
    } catch (e) {
      debugLog("Failed to setup STT WebSocket", e);
      setState('error');
      if (onError) onError("Failed to initialize speech recognition");
    }
  }, [credentials, onError, onPartialTranscript, processPartialTranscript, processCompleteTranscript]);

  // Set up Text-to-Speech WebSocket
  const setupTTSWebSocket = useCallback(() => {
    if (!credentials) return;
    
    try {
      // Close existing connection if any
      ttsWebSocketRef.current?.close();
      
      // Create new WebSocket connection for streaming audio from ElevenLabs
      ttsWebSocketRef.current = new WebSocket(credentials.ttsEndpoint);
      
      ttsWebSocketRef.current.onopen = () => {
        debugLog("TTS WebSocket connected");
        // Send configuration message
        if (ttsWebSocketRef.current?.readyState === WebSocket.OPEN) {
          ttsWebSocketRef.current.send(JSON.stringify({
            type: 'config',
            voice_id: voiceId,
            // Enable streaming for faster response
            stream: true
          }));
          
          // Send welcome message if available
          if (welcomeMessage && state === 'connecting') {
            sendTextToSpeak(welcomeMessage);
          } else {
            // If no welcome message, move to listening state
            setState('listening');
          }
        }
      };
      
      ttsWebSocketRef.current.onmessage = (event) => {
        try {
          // Handle binary audio data from TTS
          if (event.data instanceof Blob) {
            playAudioChunk(event.data);
            setIsSpeaking(true);
          } else {
            // Handle control messages
            const data = JSON.parse(event.data);
            
            if (data.type === 'audio_complete') {
              setIsSpeaking(false);
              
              // Move to listening state after speaking, unless already processing
              if (state === 'speaking') {
                setState('listening');
              }
            }
          }
        } catch (e) {
          console.error("Error handling TTS WebSocket message:", e);
        }
      };
      
      ttsWebSocketRef.current.onerror = (error) => {
        debugLog("TTS WebSocket error", error);
        if (onError) onError("Speech synthesis error");
      };
      
      ttsWebSocketRef.current.onclose = () => {
        debugLog("TTS WebSocket closed");
        setIsSpeaking(false);
      };
    } catch (e) {
      debugLog("Failed to setup TTS WebSocket", e);
      setState('error');
      if (onError) onError("Failed to initialize speech synthesis");
    }
  }, [credentials, voiceId, welcomeMessage, state, onError, sendTextToSpeak]);

  // Request microphone access and set up streaming
  const requestMicrophoneAccess = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio processing and level detection
      if (audioContextRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyzer = audioContextRef.current.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        audioNodeRef.current = analyzer;
        
        // Setup audio level monitoring
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        const detectAudioLevel = () => {
          analyzer.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          
          const average = sum / dataArray.length;
          const normalizedLevel = average / 255;
          
          // Update audio level for visualization
          setAudioLevel(normalizedLevel);
          if (onAudioLevelChange) onAudioLevelChange(normalizedLevel);
          
          // Detect user speaking based on audio level
          const isSpeaking = normalizedLevel > 0.05;
          setIsUserSpeaking(isSpeaking);
          
          // Continue monitoring audio level
          requestAnimationFrame(detectAudioLevel);
        };
        
        detectAudioLevel();
        
        // Start streaming audio to STT WebSocket
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (sttWebSocketRef.current?.readyState === WebSocket.OPEN && state === 'listening') {
            // Convert audio to format expected by OpenAI
            const inputData = e.inputBuffer.getChannelData(0);
            const output = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            // Send audio chunk to STT WebSocket
            if (sttWebSocketRef.current) {
              sttWebSocketRef.current.send(output.buffer);
            }
          }
        };
        
        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
        
        debugLog("Microphone access granted and streaming setup complete");
        setState('listening');
      }
    } catch (e) {
      debugLog("Failed to access microphone", e);
      setState('error');
      if (onError) onError("Microphone access denied");
    }
  }, [state, onError, onAudioLevelChange]);

  // Manage WebSocket connections based on state
  useEffect(() => {
    if (state === 'connecting' && credentials) {
      // Set up STT WebSocket (for streaming audio to OpenAI)
      setupSTTWebSocket();
      
      // Set up TTS WebSocket (for streaming audio back from ElevenLabs)
      setupTTSWebSocket();
      
      // Start capturing audio when ready
      requestMicrophoneAccess();
    } else if (state === 'idle') {
      // Clean up all connections when idle
      cleanupConnections();
    }
    
    return () => {
      // Cleanup on state change or unmount
      cleanupConnections();
    };
  }, [state, credentials, setupSTTWebSocket, setupTTSWebSocket, requestMicrophoneAccess, cleanupConnections]);

  // Handle errors from credential fetching
  useEffect(() => {
    if (credentialsError && state !== 'idle') {
      debugLog("Failed to fetch voice credentials", credentialsError);
      setState('error');
      if (onError) onError("Voice service unavailable. Please try again later.");
    }
  }, [credentialsError, onError, state]);

  // Start voice session
  const startSession = useCallback(() => {
    if (state !== 'idle' && state !== 'error') return;
    
    setUserTranscript('');
    setPartialResponse('');
    setState('connecting');
  }, [state]);

  // Stop voice session
  const stopSession = useCallback(() => {
    cleanupConnections();
    setState('idle');
  }, [cleanupConnections]);

  // Return interface
  return {
    state,
    isLoading,
    startSession,
    stopSession,
    userTranscript,
    partialResponse,
    audioLevel,
    isSpeaking,
    isUserSpeaking
  };
} 