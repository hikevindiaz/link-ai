import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

// Voice state definitions
export type VoiceState = 'idle' | 'connecting' | 'waiting' | 'listening' | 'processing' | 'speaking' | 'error';

// Voice definitions for agents
export const AGENT_VOICES = {
  default: {
    name: "Default Voice",
    elevenLabsId: "21m00Tcm4TlvDq8ikWAM", // Default ElevenLabs voice ID
  }
};

// Props for the hook
export interface VoiceInterfaceProps {
  chatbotId?: string;
  welcomeMessage?: string;
  onTranscriptReceived?: (text: string, isFinal: boolean) => void;
  onSpeechComplete?: () => void;
  onError?: (message: string) => void;
  debug?: boolean;
}

// Return type for our hook
export interface VoiceInterfaceReturn {
  // State
  isCallActive: boolean;
  hasPlayedWelcomeMessage: boolean;
  statusText: string;
  userTranscript: string;
  
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
  toggleCall: () => void;
  sendTextToSpeak: (text: string) => void;
  
  // Raw state
  voiceState: VoiceState;
}

/**
 * Enhanced Voice Interface Hook optimized for low latency
 * Manages voice state, WebSocket connections, and audio processing
 */
export const useVoiceInterfaceV2 = ({
  chatbotId,
  welcomeMessage = "Hello! How can I help you today?",
  onTranscriptReceived,
  onSpeechComplete,
  onError,
  debug = false
}: VoiceInterfaceProps): VoiceInterfaceReturn => {
  // Create loggers
  const log = useCallback((...args: any[]) => {
    if (debug) console.log("[Voice]", ...args);
  }, [debug]);
  
  const error = useCallback((msg: string, err?: any) => {
    console.error("[Voice Error]", msg, err);
    if (onError) onError(msg);
    return msg;
  }, [onError]);
  
  // State
  const [isCallActive, setIsCallActive] = useState(false);
  const [hasPlayedWelcomeMessage, setHasPlayedWelcomeMessage] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeechRecognitionSuspended, setIsSpeechRecognitionSuspended] = useState(false);
  const [isTransitioningToListening, setIsTransitioningToListening] = useState(false);
  
  // WebSocket and API refs
  const ttsSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // State tracking refs
  const isRecordingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const welcomeMessageStatusRef = useRef<'pending' | 'playing' | 'completed'>('pending');
  const stateChangeTimeRef = useRef<number>(Date.now());
  const lastTranscriptRef = useRef<string>('');
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasSimulatedMessageRef = useRef<boolean>(false);

  // Speech recognition ref
  const recognitionRef = useRef<any>(null);

  // Store recently spoken text to filter out self-listening
  const recentAiSpeeches = useRef<string[]>([]);
  const speechStartTimeRef = useRef<number>(0);
  const speechEndTimeRef = useRef<number>(0);

  // Fetch credentials when needed
  const { data: credentials, error: credentialsError } = useSWR(
    isCallActive ? `/api/voice-credentials?chatbotId=${chatbotId || ''}` : null,
    async (url) => {
      log("Fetching voice credentials");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch voice credentials");
      const data = await res.json();
      
      console.log("Voice credentials received:", data);
      
      return data;
    },
    { 
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000 
    }
  );

  // Clean up voice session
  const cleanupVoiceSession = useCallback(() => {
    log("Cleaning up voice session");
    
    // Reset simulation state
    hasSimulatedMessageRef.current = false;
    
    // Close WebSocket
    if (ttsSocketRef.current) {
      ttsSocketRef.current.close();
      ttsSocketRef.current = null;
    }
    
    // Clear any interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    // Stop speech recognition if active
    if (recognitionRef.current) {
      try {
        console.log("[Voice] Stopping active speech recognition");
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (err) {
        console.error("[Voice] Error stopping speech recognition:", err);
      }
    }

    // Stop any active streams
    if (streamRef.current) {
      try {
        console.log("[Voice] Stopping active media stream");
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      } catch (err) {
        console.error("[Voice] Error stopping media stream:", err);
      }
    }
    
    // Clear all timers
    console.log("[Voice] Cleaning up all timers in session cleanup");
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
    
    // Reset state
    setVoiceState('idle');
    isSpeakingRef.current = false;
    isRecordingRef.current = false;
    welcomeMessageStatusRef.current = 'pending';
    setHasPlayedWelcomeMessage(false);
    setUserTranscript('');
    setIsSpeechRecognitionSuspended(false);
  }, [log]);

  // Toggle call state
  const toggleCall = useCallback(() => {
    if (isCallActive) {
      log("Ending voice call");
      
      // Set call to inactive first - this prevents any restart logic from triggering
      setIsCallActive(false);
      
      // Force stop any speech recognition in progress
      if (recognitionRef.current) {
        try {
          console.log("[Voice] Immediately stopping speech recognition");
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (err) {
          console.error("[Voice] Error stopping speech recognition:", err);
        }
      }
      
      // Force stop any active streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log("[Voice] Stopping track:", track.kind);
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Then perform detailed cleanup
      cleanupVoiceSession();
    } else {
      log("Starting voice call");
      setIsCallActive(true);
      setVoiceState('connecting');
      console.log("[Voice] Starting voice call - state changed to connecting");
    }
  }, [isCallActive, cleanupVoiceSession, log]);
  
  // Keep track of timers for cleanup
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  
  // Send text to speak function
  const sendTextToSpeak = useCallback((text: string) => {
    console.log(`[Voice] sendTextToSpeak called with text: ${text?.substring(0, 30)}${text?.length > 30 ? '...' : ''}`);
    console.log(`[Voice] Current state - isCallActive: ${isCallActive}, voiceState: ${voiceState}`);
    
    if (!text || !isCallActive) {
      log("Cannot send text to speak: no active connection or empty text");
      return;
    }
    
    try {
      log(`Sending text to speak: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`);
      
      // Record start time of speech
      speechStartTimeRef.current = Date.now();
      
      // Store this spoken text for later filtering
      // Store both the full text and chunks of it
      recentAiSpeeches.current = [text];
      
      // Also store the last 10 words - often what gets picked up
      const words = text.split(/\s+/);
      if (words.length > 10) {
        recentAiSpeeches.current.push(words.slice(-10).join(' '));
      }
      
      // Also store the last sentence if it exists
      const sentences = text.split(/[.!?]\s+/);
      if (sentences.length > 0) {
        const lastSentence = sentences[sentences.length - 1].trim();
        if (lastSentence) {
          recentAiSpeeches.current.push(lastSentence);
        }
      }
      
      // Immediately suspend speech recognition
      setIsSpeechRecognitionSuspended(true);
      console.log("[Voice] Speech recognition suspended during speaking");
      
      // Store the last speech content to help filter it out from recognition
      lastTranscriptRef.current = text;
      
      setVoiceState('speaking');
      console.log("[Voice] State changed to speaking");
      
      // Use Eleven Labs for TTS
      if (credentials?.apiKey) {
        const voice = AGENT_VOICES.default;
        const voiceId = voice.elevenLabsId;
        
        // Create audio context if needed
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext();
        }
        
        // Create audio element if needed
        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
          audioElementRef.current.addEventListener('ended', () => {
            console.log("[Voice] Audio playback ended");
            
            // Record end time of speech for duration calculation
            speechEndTimeRef.current = Date.now();
            const speechDuration = speechEndTimeRef.current - speechStartTimeRef.current;
            console.log(`[Voice] Speech duration: ${speechDuration}ms`);
            
            // Set state and prevent race conditions 
            setIsTransitioningToListening(true);
            setVoiceState('listening');
            setHasPlayedWelcomeMessage(true);
            
            // Calculate delay based on speech duration
            // Longer speech = longer delay needed to avoid echo
            const baseDelay = 2000; // Base 2 second delay
            const additionalDelay = Math.min(speechDuration / 5, 2000); // Up to 2 additional seconds for long speeches
            const totalDelay = baseDelay + additionalDelay;
            
            console.log(`[Voice] Setting post-speech delay of ${totalDelay}ms`);
            
            // Add a longer delay before re-enabling speech recognition
            // to prevent picking up AI's own speech
            setTimeout(() => {
              setIsSpeechRecognitionSuspended(false);
              setIsTransitioningToListening(false);
              console.log("[Voice] Speech recognition re-enabled after delay");  
            }, totalDelay);
            
            if (onSpeechComplete) {
              onSpeechComplete();
            }
          });
        }
        
        // Generate TTS using Eleven Labs API
        fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': credentials.apiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_flash_v2_5",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`TTS request failed: ${response.status}`);
          }
          return response.blob();
        })
        .then(audioBlob => {
          const url = URL.createObjectURL(audioBlob);
          
          if (audioElementRef.current) {
            // Clean up previous URL if exists
            if (audioElementRef.current.src) {
              URL.revokeObjectURL(audioElementRef.current.src);
            }
            
            audioElementRef.current.src = url;
            audioElementRef.current.play().catch(err => {
              console.error("[Voice] Error playing audio:", err);
              setVoiceState('listening');
              setIsTransitioningToListening(false);
              
              // Add a delay before re-enabling speech recognition
              setTimeout(() => {
                setIsSpeechRecognitionSuspended(false);
              }, 3000); // Increased to 3 seconds
            });
          }
        })
        .catch(err => {
          console.error("[Voice] TTS request failed:", err);
          error("Failed to generate speech", err);
          setVoiceState('listening');
          setIsTransitioningToListening(false);
          
          // Add a delay before re-enabling speech recognition in error case
          setTimeout(() => {
            setIsSpeechRecognitionSuspended(false);
          }, 3000); // Increased to 3 seconds
        });
      } else {
        // Fallback to browser TTS if no API key
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
          // Record end time of speech for duration calculation
          speechEndTimeRef.current = Date.now();
          const speechDuration = speechEndTimeRef.current - speechStartTimeRef.current;
          
          setVoiceState('listening');
          setIsTransitioningToListening(false);
          
          // Calculate delay based on speech duration
          const totalDelay = 2000 + Math.min(speechDuration / 5, 2000);
          
          // Add a delay before re-enabling speech recognition
          setTimeout(() => {
            setIsSpeechRecognitionSuspended(false); 
            console.log("[Voice] Speech recognition re-enabled after delay");
          }, totalDelay);
          
          setHasPlayedWelcomeMessage(true);
          if (onSpeechComplete) {
            onSpeechComplete();
          }
        };
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      error("Failed to send text to TTS", err);
      setVoiceState('listening');
      setIsTransitioningToListening(false);
      
      // Add a delay before re-enabling speech recognition in error case
      setTimeout(() => {
        setIsSpeechRecognitionSuspended(false);
      }, 3000); // Increased to 3 seconds
    }
  }, [isCallActive, log, error, onSpeechComplete, voiceState, credentials]);
  
  // Handle successful credential fetch independent of the useEffect
  useEffect(() => {
    if (credentials && !credentialsError) {
      console.log("[Voice] Credentials data received trigger");
      
      // Only proceed if we're in the connecting state to avoid loops
      if (voiceState === 'connecting') {
        console.log("[Voice] Force transition from connecting to waiting state");
        
        // Move to waiting immediately
        setVoiceState('waiting');
        
        // Speak a welcome message right away
        const welcomeText = welcomeMessage || "Hello! How can I help you today?";
        console.log(`[Voice] Speaking welcome message: "${welcomeText}"`);
        
        // Use actual TTS to speak the welcome message
        setTimeout(() => {
          sendTextToSpeak(welcomeText);
        }, 500);
      }
    }
  }, [credentials, credentialsError, voiceState, welcomeMessage, sendTextToSpeak]);

  // Handle credential errors
  useEffect(() => {
    if (credentialsError) {
      console.error("[Voice] Error fetching credentials:", credentialsError);
      error("Failed to fetch voice credentials", credentialsError);
      setVoiceState('error');
    }
  }, [credentialsError, error]);

  // Clean up all timers when the component unmounts or call is ended
  useEffect(() => {
    return () => {
      console.log("[Voice] Cleaning up all timers");
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);
  
  // Also clear timers when call is ended
  useEffect(() => {
    if (!isCallActive) {
      console.log("[Voice] Call ended, clearing all timers");
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    }
  }, [isCallActive]);
  
  // Monitor all state changes
  useEffect(() => {
    console.log(`[Voice] State changed to: ${voiceState} (isCallActive: ${isCallActive})`);
  }, [voiceState, isCallActive]);
  
  // Start speech recognition - Immediate activation after welcome message
  const startSpeechRecognition = useCallback(() => {
    // Add an extra safeguard against starting when call is not active
    if (!isCallActive) {
      console.log("[Voice] Not starting speech recognition - call is not active");
      return;
    }
    
    // Only start if we're in listening mode, call is active, and recognition is not suspended
    if (voiceState !== 'listening' || !isCallActive || isSpeechRecognitionSuspended) {
      if (isSpeechRecognitionSuspended) {
        console.log("[Voice] Speech recognition suspended - not starting while AI is speaking");
      }
      return;
    }
    
    try {
      console.log("[Voice] Starting speech recognition");
      
      // Check if browser supports SpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Speech recognition not supported in this browser");
      }
      
      // Clear existing recognition instance if it exists
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }

      // Don't start a new recognition if the call was turned off
      if (!isCallActive) {
        console.log("[Voice] Call ended during recognition setup, aborting");
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      // Event handlers
      recognition.onstart = () => {
        console.log("[Voice] Speech recognition started");
        // Double-check call is still active before setting recording state
        if (!isCallActive) {
          console.log("[Voice] Call became inactive after recognition started, stopping");
          recognition.stop();
          return;
        }
        isRecordingRef.current = true;
      };
      
      recognition.onresult = (event) => {
        // Only process results if call is still active
        if (!isCallActive) {
          console.log("[Voice] Ignoring speech result as call is no longer active");
          recognition.stop();
          return;
        }
        
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        const isFinal = event.results[0].isFinal;
        
        console.log(`[Voice] Speech recognition result (${isFinal ? 'final' : 'interim'}):`, transcript);
        
        // MUCH stronger self-speech detection logic
        const cleanTranscript = transcript.toLowerCase().trim();
        
        // Check if this is likely the AI's own speech being picked up using multiple methods
        let isLikelyAISpeech = false;
        
        // 1. Time-based check: If we just finished speaking very recently, likely echo
        const timeSinceLastSpeech = Date.now() - speechEndTimeRef.current;
        if (timeSinceLastSpeech < 1500) {
          console.log(`[Voice] Very recent speech end (${timeSinceLastSpeech}ms ago), likely echo`);
          isLikelyAISpeech = true;
        }
        
        // 2. Compare with recent AI speeches
        if (!isLikelyAISpeech) {
          for (const aiSpeech of recentAiSpeeches.current) {
            const aiLower = aiSpeech.toLowerCase();
            
            // Exact match check
            if (aiLower === cleanTranscript) {
              console.log("[Voice] Exact match with AI speech");
              isLikelyAISpeech = true;
              break;
            }
            
            // Partial match check
            if (aiLower.includes(cleanTranscript) || cleanTranscript.includes(aiLower)) {
              console.log("[Voice] Partial match with AI speech");
              isLikelyAISpeech = true;
              break;
            }
            
            // Word by word similarity check
            const transcriptWords = cleanTranscript.split(/\s+/);
            const aiWords = aiLower.split(/\s+/);
            
            if (transcriptWords.length >= 3) { // Only check if we have enough words
              // Count matching words
              const matchingWords = transcriptWords.filter(word => 
                aiWords.includes(word) && word.length > 3 // Only count significant words
              );
              
              // If more than half the words match, it's likely AI speech
              if (matchingWords.length >= transcriptWords.length * 0.5) {
                console.log("[Voice] Word similarity match with AI speech");
                isLikelyAISpeech = true;
                break;
              }
            }
          }
        }
        
        // 3. Check for common AI phrases (extended list)
        if (!isLikelyAISpeech) {
          const commonAIPhrases = [
            "how can i help you",
            "how can i assist you",
            "how can we help you",
            "how can we assist you",
            "how may i help you",
            "how may i assist you",
            "we appreciate your",
            "we are here to assist",
            "is there anything else",
            "thank you for your",
            "let me know if",
            "how can i be of",
            "i'm here to help",
            "we're here to help"
          ];
          
          isLikelyAISpeech = commonAIPhrases.some(phrase => cleanTranscript.includes(phrase));
          if (isLikelyAISpeech) {
            console.log("[Voice] Common AI phrase detected");
          }
        }
        
        // If we detect self-speech, ignore it
        if (isLikelyAISpeech && isFinal) {
          console.log("[Voice] Detected AI's own speech, ignoring:", transcript);
          recognition.stop();
          
          // Restart recognition after ignoring AI speech
          setTimeout(() => {
            if (isCallActive && voiceState === 'listening' && !isSpeechRecognitionSuspended) {
              startSpeechRecognition();
            }
          }, 300);
          
          return;
        }
        
        // Only when we're confident this is actually user speech, set the transcript
        setUserTranscript(transcript);
        
        // Notify parent with interim results
        if (onTranscriptReceived) {
          onTranscriptReceived(transcript, isFinal);
        }
        
        // If final, stop recording and process
        if (isFinal) {
          recognition.stop();
          setVoiceState('processing');
        }
      };
      
      recognition.onerror = (event) => {
        console.error("[Voice] Speech recognition error:", event.error);
        isRecordingRef.current = false;
        
        // Only show error for non-timeout errors (timeout is normal)
        if (event.error !== 'no-speech') {
          error(`Speech recognition error: ${event.error}`);
        }
      };
      
      recognition.onend = () => {
        console.log("[Voice] Speech recognition ended");
        isRecordingRef.current = false;
        
        // CRITICAL FIX: Only restart if call is still active and explicitly in listening state
        // Add multiple safeguards to prevent auto-restart after hangup
        if (isCallActive && 
            voiceState === 'listening' && 
            !isSpeechRecognitionSuspended && 
            !isTransitioningToListening &&
            recognitionRef.current === recognition) { // Ensure this is still the current instance
            
          // Restart after a short delay
          const timer = setTimeout(() => {
            // Re-check conditions just before starting again
            if (isCallActive && 
                voiceState === 'listening' && 
                !isSpeechRecognitionSuspended &&
                !isTransitioningToListening &&
                recognitionRef.current === recognition) {
              console.log("[Voice] Restarting speech recognition");
              recognition.start();
            } else {
              console.log("[Voice] Conditions changed, not restarting speech recognition");
            }
          }, 300);
          
          // Track this timer for cleanup
          timersRef.current.push(timer);
        } else {
          console.log("[Voice] Not restarting speech recognition due to state change:",
            { isCallActive, voiceState, isSuspended: isSpeechRecognitionSuspended, isTransitioning: isTransitioningToListening });
        }
      };
      
      // Start recognition immediately
      recognition.start();
      
    } catch (err) {
      console.error("[Voice] Failed to start speech recognition:", err);
      error("Speech recognition failed. Please try again.");
      isRecordingRef.current = false;
    }
  }, [voiceState, isCallActive, error, onTranscriptReceived, isSpeechRecognitionSuspended, isTransitioningToListening]);

  // Start recognition when we enter listening mode and not suspended or transitioning
  useEffect(() => {
    if (voiceState === 'listening' && isCallActive && !isSpeechRecognitionSuspended && !isTransitioningToListening) {
      // Start immediately when conditions are right - no delay
      console.log("[Voice] Conditions right for immediate speech recognition start");
      startSpeechRecognition();
    }
  }, [voiceState, isCallActive, startSpeechRecognition, isSpeechRecognitionSuspended, isTransitioningToListening]);
  
  // Compute orb animation states
  const orbIsListening = voiceState === 'listening' && !isRecordingRef.current;
  const orbIsUserSpeaking = voiceState === 'listening' && isRecordingRef.current;
  const orbIsProcessing = voiceState === 'processing';
  const orbIsConnecting = voiceState === 'connecting';
  const orbIsSpeaking = voiceState === 'speaking';
  const orbIsWaiting = voiceState === 'waiting';
  const orbIsReady = voiceState === 'waiting' && hasPlayedWelcomeMessage;
  const orbAudioLevel = audioLevel;
  
  // Generate status text
  const statusText = useMemo(() => {
    switch (voiceState) {
      case 'idle': return isCallActive ? "Voice call ended" : "Click 'Start Voice Call' to begin";
      case 'connecting': return "Connecting...";
      case 'waiting': return hasPlayedWelcomeMessage ? "I'm ready" : "Getting ready...";
      case 'listening': return isRecordingRef.current ? "Listening..." : "How can I help?";
      case 'processing': return "Processing...";
      case 'speaking': return "Speaking...";
      case 'error': return "Voice service error";
      default: return "Initializing...";
    }
  }, [voiceState, isCallActive, hasPlayedWelcomeMessage]);
  
  // Monitor call state changes with stronger guarantees
  useEffect(() => {
    if (!isCallActive) {
      console.log("[Voice] Call is now inactive, performing comprehensive cleanup");
      
      // Explicitly set voice state to idle
      setVoiceState('idle');
      
      // Clear any transcripts
      setUserTranscript('');
      
      // Make sure we stop speech recognition when call ends
      if (recognitionRef.current) {
        try {
          console.log("[Voice] Stopping speech recognition on call end");
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (err) {
          console.error("[Voice] Error stopping speech recognition on call end:", err);
        }
      }
      
      // Stop any active audio element
      if (audioElementRef.current) {
        try {
          console.log("[Voice] Stopping audio playback");
          audioElementRef.current.pause();
          audioElementRef.current.currentTime = 0;
        } catch (err) {
          console.error("[Voice] Error stopping audio playback:", err);
        }
      }
      
      // Cancel all pending timers
      console.log("[Voice] Clearing all pending timers");
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
      
      // Reset recording state
      isRecordingRef.current = false;
    }
  }, [isCallActive]);
  
  // Return the hook interface
  return {
    // State
    isCallActive,
    hasPlayedWelcomeMessage,
    statusText,
    userTranscript,
    
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
    toggleCall,
    sendTextToSpeak,
    
    // Raw state
    voiceState
  };
}