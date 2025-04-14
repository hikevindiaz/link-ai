import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
// Import the modular hook and its types DIRECTLY
import { 
  useVoiceInterface as useModularVoiceInterface, 
  ElevenlabsVoiceProps, 
  VoiceState 
} from './use-elevenlabs-realtime-modular';

// Define the expected return type based on the modular file's exports
interface UseElevenlabsRealtimeReturn {
  currentState: VoiceState;
  audioLevel: number;
  isLoading: boolean;
  hasConnectionError: boolean;
  credentials?: any; // Add credentials (type can be more specific if known)
  startSession: () => void;
  stopSession: () => void;
  sendTextToSpeak: (text: string) => void;
  resetErrorState: () => void;
  testAudioPlayback: () => boolean;
}

// Define props for THIS hook, inheriting relevant props from the underlying hook's props
interface UseVoiceInterfaceProps extends Omit<ElevenlabsVoiceProps, 'initialState'> {
  onSpeechComplete?: () => void; // Add specific callback for UI
}

interface UseVoiceInterfaceReturn {
  // State
  isCallActive: boolean;
  hasPlayedWelcomeMessage: boolean;
  apiConnectionFailed: boolean;
  audioLevel: number;
  statusText: string;
  elevenLabsUserTranscript: string;
  
  // Animation States
  orbIsListening: boolean;
  orbIsUserSpeaking: boolean;
  orbIsProcessing: boolean;
  orbIsConnecting: boolean;
  orbIsSpeaking: boolean;
  orbIsWaiting: boolean;
  orbIsReady: boolean;
  orbAudioLevel: number;
  
  // Controls
  startCall: () => void;
  endCall: () => void;
  toggleCall: () => void;
  sendTextToSpeak: (text: string) => void;
  testAudio: () => void;
  
  // Expose raw state for potential advanced use
  elevenLabsState: VoiceState;
}

export function useVoiceInterface({
  chatbotId,
  welcomeMessage,
  onTranscriptReceived,
  onSpeechComplete,
  onError, // Get onError from props
  debug = false // Get debug from props
}: UseVoiceInterfaceProps): UseVoiceInterfaceReturn {
  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [hasPlayedWelcomeMessage, setHasPlayedWelcomeMessage] = useState(false);
  const [apiConnectionFailed, setApiConnectionFailed] = useState(false);
  const [elevenLabsUserTranscript, setElevenLabsUserTranscript] = useState('');
  
  // Message tracking refs
  const messageBeingSpokenRef = useRef<string | null>(null);
  const lastSpokenMessageRef = useRef<string | null>(null);
  const previousElevenLabsState = useRef<VoiceState>('idle');
  
  // Handle transcript reception to store locally
  const handleTranscriptReceived = useCallback((text: string, isFinal: boolean) => {
    setElevenLabsUserTranscript(text);
    
    // Pass through to the provided handler
    if (onTranscriptReceived) {
      onTranscriptReceived(text, isFinal);
    }
  }, [onTranscriptReceived]);
  
  // Use the underlying MODULAR hook directly
  const realtimeHookProps: ElevenlabsVoiceProps = {
    chatbotId,
    isCallActive,
    onTranscriptReceived: handleTranscriptReceived,
    welcomeMessage,
    onError: (msg) => {
      console.error("ElevenLabs error:", msg);
      toast.error(`Voice service error: ${msg}`);
      setApiConnectionFailed(true);
      if (onError) onError(msg); // Call the passed onError handler
    },
    debug: debug
  };

  // Call the MODULAR hook directly
  const {
    currentState: elevenLabsState,
    isLoading: isApiKeyLoading,
    hasConnectionError,
    audioLevel,
    credentials, // <-- Get credentials from the hook
    startSession: startElevenLabsSession,
    stopSession: stopElevenLabsSession,
    sendTextToSpeak: elevenLabsSendTextToSpeak,
    resetErrorState: resetElevenLabsError,
    testAudioPlayback
  } = useModularVoiceInterface(realtimeHookProps);
  
  // Create our own reset function that calls the underlying one
  const resetErrorStateAndCall = useCallback(() => {
    console.log("Resetting error state");
    resetElevenLabsError(); // Call the function from the hook
    setApiConnectionFailed(false); // Also reset our local flag
  }, [resetElevenLabsError]);

  // Test the audio playback system using the function from the hook
  const testAudio = useCallback(() => {
    console.log("Testing audio playback via hook");
    const result = testAudioPlayback(); // Call the function from the hook
    
    if (result) {
      toast.success("Audio system check passed");
    } else {
      toast.error("Audio playback check failed - check browser permissions or output device");
    }
  }, [testAudioPlayback]);

  // Toggle call state
  const toggleCall = useCallback(() => {
    if (isCallActive) {
      console.log("Toggling Call: OFF");
      setIsCallActive(false);
      setHasPlayedWelcomeMessage(false);
      stopElevenLabsSession();
      messageBeingSpokenRef.current = null;
      lastSpokenMessageRef.current = null;
    } else {
      console.log("Toggling Call: ON - Setting active flag, will start session when ready");
      setIsCallActive(true); // Set intent to start
      setHasPlayedWelcomeMessage(false);
      messageBeingSpokenRef.current = null;
      lastSpokenMessageRef.current = null;
      setApiConnectionFailed(false); // Reset connection error flag on start attempt
      
      // DO NOT start session immediately here
    }
  }, [isCallActive, stopElevenLabsSession]); // Removed startElevenLabsSession dependency

  // Effect to start the session only when active and credentials are ready
  useEffect(() => {
    // Track if this effect instance has been cleaned up
    let isEffectActive = true;
    
    // Trigger ONLY when isCallActive is true AND credentials object exists
    if (isCallActive && credentials) { 
      // Check if the current state allows starting (e.g., not already connecting/speaking)
      if (elevenLabsState === 'idle' || elevenLabsState === 'error') { 
        console.log("Call is active and credentials EXIST, attempting to start session.");
        try {
          // Only call start session if the effect is still active
          if (isEffectActive) {
            startElevenLabsSession();
          }
        } catch (e) {
          console.error("Error starting ElevenLabs session from effect:", e);
          if (isEffectActive) {
            setIsCallActive(false); // Turn off call if start fails
            setApiConnectionFailed(true);
            toast.error("Failed to initialize voice session.");
          }
        }
      } else {
        console.log(`Call is active, credentials exist, but state is ${elevenLabsState}. Not starting session now.`);
      }
    } else if (isCallActive && !credentials) {
      console.log("Call is active but waiting for credentials object...");
    }
    
    // Cleanup function
    return () => {
      isEffectActive = false;
    };
    // Important: Keep only the truly required dependencies to prevent re-renders
  }, [isCallActive, credentials, elevenLabsState, startElevenLabsSession]);

  // Explicitly start and end call
  const startCall = useCallback(() => {
    if (!isCallActive) {
      toggleCall(); // Use toggle logic for consistency
    }
  }, [isCallActive, toggleCall]);
  
  const endCall = useCallback(() => {
    if (isCallActive) {
      toggleCall(); // Use toggle logic for consistency
    }
  }, [isCallActive, toggleCall]);

  // Send text to speak wrapper
  const sendTextToSpeak = useCallback((text: string) => {
    if (!text || !isCallActive) return;
    
    console.log("UI Sending text to speak:", text);
    messageBeingSpokenRef.current = text;
    elevenLabsSendTextToSpeak(text);
  }, [isCallActive, elevenLabsSendTextToSpeak]);

  // Add an effect to automatically update the call active status based on the current state
  useEffect(() => {
    // If an error occurs OR connection fails, ensure the call is marked inactive
    if (isCallActive && (elevenLabsState === 'error' || hasConnectionError)) {
      console.log(`ElevenLabs state (${elevenLabsState}, error: ${hasConnectionError}) requires ending call status`);
      setIsCallActive(false); // Mark call as inactive on error
    }
    
    // Keep track of previous state transitions
    if (previousElevenLabsState.current !== elevenLabsState) {
      console.log(`[Voice State] Changed from ${previousElevenLabsState.current} to ${elevenLabsState}`);
      previousElevenLabsState.current = elevenLabsState;
    }
  }, [elevenLabsState, isCallActive, hasConnectionError]);

  // Update effect to handle voice response completion
  useEffect(() => {
    // When a response finishes (state transitions *from* speaking)
    if (previousElevenLabsState.current === 'speaking' && elevenLabsState !== 'speaking') {
      console.log(`Voice response completed (State: ${elevenLabsState}), ensuring call remains active`);
      
      // Ensure welcome message flag is set if this was the welcome message
      if (!hasPlayedWelcomeMessage && messageBeingSpokenRef.current === welcomeMessage) {
        console.log("Setting hasPlayedWelcomeMessage after welcome message spoke");
        setHasPlayedWelcomeMessage(true);
      }
      
      // Clear the message being spoken
      if (messageBeingSpokenRef.current) {
        lastSpokenMessageRef.current = messageBeingSpokenRef.current;
        messageBeingSpokenRef.current = null;
      }
      
      // Call the speech complete callback if provided
      if (onSpeechComplete) {
        onSpeechComplete();
      }
    }
  }, [elevenLabsState, hasPlayedWelcomeMessage, onSpeechComplete, welcomeMessage]);

  // Add monitor for connection timeout (monitor the raw state)
  useEffect(() => {
    let connectingTimeoutId: NodeJS.Timeout | null = null;
    if (isCallActive && elevenLabsState === 'connecting') {
      connectingTimeoutId = setTimeout(() => {
        if (elevenLabsState === 'connecting') { // Check again inside timeout
          console.log("Voice connection stuck in connecting state - Timeout");
          toast.error("Voice service connection failed. Please try again later.");
          setApiConnectionFailed(true);
          setIsCallActive(false); // Ensure call state reflects failure
          stopElevenLabsSession(); // Attempt cleanup
        }
      }, 15000); // 15 second timeout
    }
    
    return () => {
      if (connectingTimeoutId) clearTimeout(connectingTimeoutId);
    };
  }, [elevenLabsState, isCallActive, stopElevenLabsSession]);

  // Add effect to monitor error state and ensure we don't get permanently stuck
  useEffect(() => {
    let errorStateTimeoutId: NodeJS.Timeout | null = null;
    if (elevenLabsState === 'error') {
      console.log("Voice service entered error state - setting auto-recovery timeout");
      
      errorStateTimeoutId = setTimeout(() => {
        if (elevenLabsState === 'error') { // Check again inside timeout
          console.log("Auto-resetting from persistent error state");
          resetErrorStateAndCall(); // Use our combined reset function
        }
      }, 30000); // 30 second timeout
    }
    
    return () => {
      if (errorStateTimeoutId) clearTimeout(errorStateTimeoutId);
    };
  }, [elevenLabsState, resetErrorStateAndCall]);

  // Welcome message effect - simplified, relies on TTS hook logic
  useEffect(() => {
    // If the call becomes active and the state moves to 'waiting', the underlying hook
    // should handle playing the welcome message if welcomeMessageStatusRef is 'pending'.
    // We just need to ensure the welcome message flag is managed correctly.
    if (isCallActive && elevenLabsState === 'waiting' && !hasPlayedWelcomeMessage) {
       // The underlying hook handles the actual playback based on welcomeMessageStatusRef
       console.log("Call active and waiting, welcome message playback handled by TTS hook.")
    }
  }, [isCallActive, elevenLabsState, hasPlayedWelcomeMessage]);

  // Reset hasPlayedWelcomeMessage when ending a call
  useEffect(() => {
    if (!isCallActive) {
      setHasPlayedWelcomeMessage(false);
    }
  }, [isCallActive]);

  // Orb animation states
  const orbIsReady = isCallActive && elevenLabsState === 'waiting' && hasPlayedWelcomeMessage;
  const orbIsListening = isCallActive && elevenLabsState === 'listening' && !elevenLabsUserTranscript.length;
  const orbIsUserSpeaking = isCallActive && elevenLabsState === 'listening' && (elevenLabsUserTranscript.length > 0 || audioLevel > 0.1);
  const orbIsProcessing = isCallActive && elevenLabsState === 'processing';
  const orbIsConnecting = isCallActive && (elevenLabsState === 'connecting' || isApiKeyLoading); // Include loading state
  const orbIsSpeaking = isCallActive && elevenLabsState === 'speaking';
  const orbIsWaiting = isCallActive && elevenLabsState === 'waiting' && !hasPlayedWelcomeMessage;

  // Update audio level calculation for more natural animation
  const orbAudioLevel = useMemo(() => {
    if (orbIsUserSpeaking) {
      const amplifiedLevel = Math.pow(audioLevel, 0.6) * 1.5; // Slightly less amplification
      return Math.min(1, amplifiedLevel); 
    } 
    else if (orbIsSpeaking) {
      return 0.4 + (Math.sin(Date.now() / 180) * 0.1); // Slower pulse
    } 
    else if (orbIsProcessing || orbIsConnecting) {
      return 0.25 + (Math.sin(Date.now() / 350) * 0.05); // Slower, calmer pulse
    } 
    else if (orbIsReady) {
      return 0.1 + (Math.sin(Date.now() / 1800) * 0.03); // Very subtle idle pulse
    } 
    else if (orbIsListening) {
      return 0.15 + (Math.sin(Date.now() / 900) * 0.04); // Calm listening pulse
    } 
    else if (orbIsWaiting) {
      return 0.12; // Slightly more active than pure idle
    }
    return 0.08; // Base idle level
  }, [
    orbIsUserSpeaking, orbIsSpeaking, orbIsProcessing, orbIsConnecting, 
    orbIsReady, orbIsListening, orbIsWaiting, audioLevel
  ]);

  // Status text generation
  const statusText = useMemo(() => {
    if (isApiKeyLoading && isCallActive) {
      return "Initializing...";
    } else if (isCallActive) {
      switch (elevenLabsState) {
        case 'connecting': return "Connecting...";
        case 'waiting': return hasPlayedWelcomeMessage ? "I'm ready." : "Getting ready...";
        case 'listening': return orbIsUserSpeaking ? "Listening..." : "How can I help?";
        case 'processing': return "Processing...";
        case 'speaking': return "Speaking...";
        case 'error': return "Voice service error";
        case 'idle': return "Voice call ended"; // Should ideally be caught by isCallActive=false
        default: return "Initializing...";
      }
    } else {
      return hasConnectionError ? "Connection failed" : "Click 'Voice Call' to start";
    }
  }, [isApiKeyLoading, isCallActive, elevenLabsState, hasPlayedWelcomeMessage, orbIsUserSpeaking, hasConnectionError]);

  return {
    // State
    isCallActive,
    hasPlayedWelcomeMessage,
    apiConnectionFailed,
    audioLevel,
    statusText,
    elevenLabsUserTranscript,
    
    // Animation States
    orbIsListening,
    orbIsUserSpeaking,
    orbIsProcessing,
    orbIsConnecting,
    orbIsSpeaking,
    orbIsWaiting,
    orbIsReady,
    orbAudioLevel,
    
    // Controls
    startCall,
    endCall,
    toggleCall,
    sendTextToSpeak,
    testAudio,
    
    // ElevenLabs state
    elevenLabsState
  };
} 