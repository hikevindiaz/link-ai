'use client';

/**
 * Main voice interaction hook that integrates with ElevenLabs for real-time
 * text-to-speech and handles audio recording and processing.
 * 
 * This version uses the modular components from hooks/voice directory
 * while maintaining the WebSocket improvements for low latency.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useAudioRecording } from './voice/use-audio-recording';
import { useElevenlabsSpeech } from './voice/use-elevenlabs-speech';
import { useOpenAiSpeechRecognition } from './voice/use-openai-speech-recognition';
import { useSpeechState } from './voice/use-speech-state';

// Define the voice interface states
export type VoiceState = 'idle' | 'connecting' | 'waiting' | 'listening' | 'processing' | 'speaking' | 'error';

// Props for the hook
export interface ElevenlabsVoiceProps {
  chatbotId?: string;
  isCallActive?: boolean;
  onTranscriptReceived?: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  welcomeMessage?: string;
  initialState?: VoiceState;
  debug?: boolean;
}

// Helper function for debug logging
const createDebugLogger = (enabled: boolean) => 
  (...args: any[]) => {
    if (enabled) {
      console.log("[ElevenLabs Voice]", ...args);
    }
  };

/**
 * Hook to integrate with ElevenLabs for TTS and separate transcription for STT
 */
export function useVoiceInterface({
  chatbotId,
  isCallActive,
  onTranscriptReceived,
  onError,
  welcomeMessage,
  initialState = 'idle',
  debug = false
}: ElevenlabsVoiceProps) {
  const debugLog = useCallback(createDebugLogger(debug), [debug]);

  // Voice state tracking using the dedicated hook
  const {
    currentState,
    setSyncedState: setCurrentState,
    currentStateRef
  } = useSpeechState(initialState);
  
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Welcome message tracking
  const welcomeMessageStatusRef = useRef<'pending' | 'playing' | 'completed'>('pending');
  
  // Memoize the SWR key to prevent excessive re-renders
  const swrKey = useMemo(() => {
    // Log only when key actually changes, not on every render
    const key = isCallActive ? `/api/voice-credentials?chatbotId=${chatbotId || ''}` : null;
    console.log(`%%%% SWR Key Evaluation: isCallActive=${isCallActive}, key='${key}' %%%%`);
    return key;
  }, [isCallActive, chatbotId]);
  
  const { data: credentials, isLoading } = useSWR(
    swrKey,
    // The fetcher function
    async (url) => {
      console.log("%%%% SWR Fetcher: Starting fetch for", url);
      try {
        const response = await fetch(url);
        console.log(`%%%% SWR Fetcher: Response status for ${url}: ${response.status}`);
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Failed to read error text');
          console.error(`%%%% SWR Fetcher: Fetch failed for ${url} with status ${response.status}: ${errorText}`);
          throw new Error(`Failed to fetch voice credentials (${response.status})`);
        }
        const data = await response.json();
        console.log(`%%%% SWR Fetcher: Successfully fetched and parsed JSON for ${url}`, data);
        return data;
      } catch (error) {
        console.error(`%%%% SWR Fetcher: CRITICAL ERROR during fetch for ${url}`, error);
        setHasConnectionError(true);
        setCurrentState('error');
        // Re-throw the error so SWR can handle it in its onError
        throw error; 
      }
    },
    // SWR options
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      refreshInterval: 0,
      dedupingInterval: 10000, // 10 seconds
      onSuccess: (data) => {
        console.log("%%%% SWR Hook: onSuccess triggered", data);
        debugLog("Voice credentials received", data);
        setHasConnectionError(false);
      },
      onError: (error) => {
        console.error("%%%% SWR Hook: onError triggered", error);
        debugLog("Error fetching voice credentials:", error);
        setHasConnectionError(true);
        setCurrentState('error');
        if (onError) onError("Could not connect to voice service");
      }
    }
  );

  // ADD LOG to inspect credentials after SWR
  useEffect(() => {
    if (credentials) {
      console.log("%%%% Modular Hook: Credentials object received from SWR:", JSON.stringify(credentials));
    }
  }, [credentials]);

  // Reset error state function
  const resetErrorState = useCallback(() => {
    debugLog("Explicitly resetting error state");
    setCurrentState('idle');
    setHasConnectionError(false);
    welcomeMessageStatusRef.current = 'pending';
  }, [setCurrentState]);

  // Use the audio recording hook
  const {
    startRecording,
    stopRecording,
    setupAudioRecording,
    cleanupAudioRecording,
    currentAudioLevel
  } = useAudioRecording({
    onAudioReady: (audioBlob) => {
      debugLog(`Audio recording ready: ${audioBlob.size} bytes`);
      // Send to our transcription API
      processAudioBlob(audioBlob);
    },
    onAudioLevelChange: (level) => {
      setAudioLevel(level);
    },
    onSilenceDetected: () => {
      // When silence is detected, finalize the speech input
      if (currentState === 'listening') {
        debugLog("Silence detected, stopping recording");
        stopRecording();
        // The onAudioReady callback will be called with the recorded audio
      }
    },
    onSpeechDetected: () => {
      if (currentState === 'waiting') {
        debugLog("Speech detected, moving to listening state");
        setCurrentState('listening');
      }
    },
    onError: (error) => {
      debugLog("Audio recording error:", error);
      if (onError) onError(error);
    }
  });

  // Use OpenAI speech recognition
  const {
    processAudioBlob
  } = useOpenAiSpeechRecognition({
    onTranscriptReceived: (transcript, isFinal) => {
      debugLog(`Received transcript (final: ${isFinal}): ${transcript}`);
      if (onTranscriptReceived) {
        onTranscriptReceived(transcript, isFinal);
      }
      
      if (isFinal) {
        setCurrentState('processing');
      }
    },
    onError: (error) => {
      debugLog("Transcription error:", error);
      if (onError) onError(error);
      setCurrentState('waiting');
    }
  });

  // Use ElevenLabs speech with WebSocket improvements
  const {
    sendTextToSpeak: ttsSpeak,
    stopTts,
    setupTtsWebSocket
  } = useElevenlabsSpeech({
    voiceId: credentials?.voice || '21m00Tcm4TlvDq8ikWAM',
    welcomeMessage,
    welcomeMessageStatusRef,
    ttsEndpoint: credentials?.ttsEndpoint,
    apiKey: credentials?.elevenLabsApiKey,
    onSpeechStart: () => {
      debugLog("Speech started");
      setCurrentState('speaking');
    },
    onSpeechEnd: () => {
      debugLog("Speech ended");
      setCurrentState('waiting');
    },
    onError: (error) => {
      debugLog("TTS error:", error);
      if (onError) onError(error);
    }
  });

  // Wrapper for the TTS function
  const sendTextToSpeak = useCallback((text: string) => {
    if (!text?.trim()) {
      debugLog("Empty text, not sending to TTS");
      return;
    }
    
    debugLog(`Sending text to speak: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    setCurrentState('speaking');
    
    // If credentials include a ttsEndpoint, configure it before speaking
    if (credentials?.ttsEndpoint) {
      debugLog(`Using TTS endpoint: ${credentials.ttsEndpoint.replace(/api_key=([^&]*)/, 'api_key=***')}`);
    }
    
    ttsSpeak(text);
  }, [debugLog, setCurrentState, ttsSpeak, credentials]);

  // Initialize a stub placeholder for sendTextToSpeak
  const sendTextPlaceholder = useRef((text: string) => {
    debugLog("Text to speak called before initialization (placeholder)");
    setTimeout(() => setCurrentState('listening'), 500);
  });
  
  // A safe wrapper function that works before the real function is defined
  const safeSendTextToSpeak = useCallback((text: string) => {
    sendTextPlaceholder.current(text);
  }, []);
  
  // Update the placeholder reference
  useEffect(() => {
    sendTextPlaceholder.current = sendTextToSpeak;
  }, [sendTextToSpeak]);

  // Add a ref to track if audio recording is already set up
  const audioRecordingSetupRef = useRef<boolean>(false);
  
  // Start session function
  const startSession = useCallback(() => {
    console.log("%%%% ENTERING startSession (modular) %%%%");
    debugLog("Start session called");
    
    // Reset error state if needed
    if (currentState === 'error') {
      resetErrorState();
    }
    
    if (hasConnectionError) {
      debugLog("Connection is blocked due to previous errors");
      setCurrentState('error');
      if (onError) onError("Voice service unavailable. Please try again later.");
      return;
    }
    
    // Set state to connecting
    setCurrentState('connecting');
    
    // Reference to track if we've progressed beyond connection phase
    const connectionProgressRef = { hasProgressed: false };
    
    // Check if we have credentials
    if (!credentials) {
      console.error("%%%% startSession: Credentials not available! Cannot proceed. %%%%");
      debugLog("No credentials available yet, waiting...");
      return;
    }
    
    debugLog("Using voice credentials:", JSON.stringify({
      hasApiKey: !!credentials.elevenLabsApiKey,
      hasEndpoint: !!credentials.ttsEndpoint,
      endpointPreview: credentials.ttsEndpoint ? 
        credentials.ttsEndpoint.substring(0, 60).replace(/api_key=([^&]*)/, 'api_key=***') + '...' : 
        'none'
    }));
    
    // Create connection timeout to avoid getting stuck
    const connectionTimeoutId = setTimeout(() => {
      // Only trigger if we haven't progressed beyond connecting
      if (!connectionProgressRef.hasProgressed && currentState === 'connecting') {
        debugLog("Connection stuck in connecting state, resetting");
        setCurrentState('error');
        if (onError) onError("Failed to establish voice connection. Please try again.");
      } else {
        debugLog("Connection timeout triggered but already progressed beyond connecting state");
      }
    }, 10000);
    
    try {
      console.log("%%%% startSession: Entering TRY block %%%%");
      // Log for debugging
      debugLog("Attempting to connect to ElevenLabs API");
      
      // Mark that we've progressed beyond connecting
      connectionProgressRef.hasProgressed = true;
      
      // Set up TTS WebSocket
      console.log("%%%% startSession: Attempting to call setupTtsWebSocket()... %%%%");
      setupTtsWebSocket().then(() => {
        console.log("%%%% startSession: setupTtsWebSocket() promise RESOLVED %%%%");
        // Connection successful, move to waiting state
        setCurrentState('waiting');
        
        // Set up audio recording for speech detection if not already setup
        try {
          if (!audioRecordingSetupRef.current) {
            debugLog("Setting up audio recording for first time");
            setupAudioRecording();
            audioRecordingSetupRef.current = true;
          } else {
            debugLog("Audio recording already set up, reusing existing setup");
          }
          
          // Play welcome message if provided
          if (welcomeMessage && welcomeMessage.trim()) {
            debugLog("Preparing to play welcome message");
            setTimeout(() => {
              debugLog("Playing welcome message");
              setCurrentState('speaking');
              safeSendTextToSpeak(welcomeMessage);
            }, 500);
          } else {
            debugLog("No welcome message, moving directly to listening");
            setTimeout(() => {
              setCurrentState('listening');
            }, 500);
          }
        } catch (error) {
          debugLog("Error setting up audio recording:", error);
          // Continue without microphone
          if (welcomeMessage && welcomeMessage.trim()) {
            debugLog("Playing welcome message despite microphone failure");
            setTimeout(() => {
              setCurrentState('speaking');
              safeSendTextToSpeak(welcomeMessage);
            }, 500);
          } else {
            debugLog("Moving to waiting state without microphone");
            setCurrentState('waiting');
          }
        }
      }).catch(error => {
        console.error("%%%% startSession: setupTtsWebSocket() promise REJECTED %%%%", error);
        debugLog("Error setting up TTS WebSocket:", error);
        setCurrentState('error');
        if (onError) onError("Failed to establish voice connection");
      });
    } catch (error) {
      console.error("%%%% startSession: CRITICAL ERROR in try block %%%%", error);
      debugLog("Error starting session:", error);
      setCurrentState('error');
      if (onError) onError("Failed to initialize voice service connection.");
    } finally {
      console.log("%%%% startSession: Entering FINALLY block, clearing timeout %%%%", connectionTimeoutId);
      // Always clear the timeout to prevent memory leaks
      clearTimeout(connectionTimeoutId);
    }
  }, [
    currentState, 
    hasConnectionError, 
    welcomeMessage, 
    onError, 
    resetErrorState, 
    credentials,
    setupAudioRecording, 
    safeSendTextToSpeak, 
    debugLog,
    setupTtsWebSocket,
    setCurrentState
  ]);
  
  // Handle state transitions
  useEffect(() => {
    debugLog(`State changed to: ${currentState}`);
    
    if (currentState === 'listening') {
      // Start recording when in listening state
      startRecording();
    } else if (currentState === 'waiting') {
      // Ensure we're set up to detect speech, but only if not already set up
      if (!audioRecordingSetupRef.current) {
        debugLog("Setting up audio recording (first time)");
        setupAudioRecording();
        audioRecordingSetupRef.current = true;
      } else {
        debugLog("Audio recording already set up, skipping initialization");
      }
    }
  }, [currentState, startRecording, setupAudioRecording, debugLog]);

  // Reset the setup flag when cleaning up
  useEffect(() => {
    return () => {
      audioRecordingSetupRef.current = false;
    };
  }, []);

  // Modify the stopSession to reset the audio setup flag
  const stopSession = useCallback(() => {
    debugLog("Stop session called");
    
    // Stop the TTS
    stopTts();
    
    // Clean up microphone
    cleanupAudioRecording();
    
    // Reset state
    setCurrentState('idle');
    
    // Reset the audio recording setup flag
    audioRecordingSetupRef.current = false;
  }, [cleanupAudioRecording, debugLog, stopTts, setCurrentState]);

  // Initialize audio context and test audio
  const testAudioPlayback = useCallback(() => {
    try {
      debugLog("Testing audio playback");
      
      // Create audio context if needed
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      // Create and play a simple beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.5;
      
      oscillator.start();
      
      // Stop after 500ms
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        debugLog("Test audio completed");
      }, 500);
      
      return true;
    } catch (error) {
      debugLog("Test audio playback failed:", error);
      if (onError) onError("Could not create audio context - audio may not work");
      return false;
    }
  }, [debugLog, onError]);

  // Return the interface
  return {
    // Current state
    currentState,
    audioLevel,
    isLoading,
    hasConnectionError,
    credentials,
    
    // Functions
    startSession,
    stopSession,
    sendTextToSpeak,
    resetErrorState,
    testAudioPlayback
  };
}

// Re-export under original name for backward compatibility
export function useElevenlabsRealtime(props: ElevenlabsVoiceProps) {
  return useVoiceInterface(props);
} 