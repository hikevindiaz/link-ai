import { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants ---
const STT_REST_API_URL = '/api/elevenlabs/stt'; // REST endpoint for speech-to-text
const TTS_WEBSOCKET_URL = '/api/elevenlabs/tts-proxy'; // Local proxy endpoint for text-to-speech
const AUDIO_BIT_RATE = 128 * 1024; // 128 kbps
const AUDIO_SAMPLE_RATE = 16000; // 16 kHz for STT, common for telephony
const STT_MODEL = 'scribe_v1'; // ElevenLabs STT model - only scribe_v1 or scribe_v1_experimental are valid
const MIN_AUDIO_SIZE_BYTES = 10000; // Minimum audio size before sending to STT API (10KB)
const MIN_RECORDING_TIME_MS = 2000; // Minimum recording time in milliseconds (2 seconds)

// Adjust constants for silence detection to be more aggressive
const SILENCE_THRESHOLD = 0.01; // Even lower threshold to catch more silence (was 0.015)
const SILENCE_DURATION_MS = 600; // Shorter silence duration for faster termination (was 800ms)
const MIN_SPEECH_DURATION_MS = 300; // Shorter minimum speech duration (was 500ms)
const SPEECH_TIMEOUT_MS = 8000; // Shorter maximum recording duration (was 10000ms)
const RETURN_TO_WAIT_DELAY = 500; // Delay before returning to waiting state after speaking

// Add a new constant for the audio isolation endpoint
const AUDIO_ISOLATION_URL = '/api/elevenlabs/audio-isolation'; // We'll create this proxy endpoint

// --- Types ---
type ProcessingState = 'idle' | 'connecting' | 'waiting' | 'listening' | 'processing' | 'speaking' | 'error';

interface UseElevenlabsRealtimeProps {
  chatbotId: string; // Needed for context potentially
  voiceId?: string; // Specific ElevenLabs voice ID for the chatbot
  onTranscriptReceived: (transcript: string, isFinal: boolean) => void; // Callback for STT results
  onError?: (error: string) => void; // Callback for errors
  welcomeMessage?: string; // Optional welcome message to speak on connection
  onAudioLevelChange?: (level: number) => void; // Callback for audio level updates
}

interface UseElevenlabsRealtimeReturn {
  currentState: ProcessingState;
  isApiKeyLoading: boolean;
  startSession: () => void;
  stopSession: () => void;
  stopRecording: () => void; // Keep this for emergency manual stop
  sendTextToSpeak: (text: string) => void; // Function to send text for TTS
  userTranscript: string; // Live user transcript (interim)
  audioLevel: number; // Current audio level (0-1)
}

// Define WebSocketOptions type if not globally available (may vary by environment)
// This is a common structure but might need adjustment
/* // Removed WebSocketOptions interface as it's not used by browser WebSocket
interface WebSocketOptions {
    headers?: Record<string, string>;
}
*/

// --- Main Hook Logic ---
export const useElevenlabsRealtime = ({
  chatbotId,
  voiceId = '21m00Tcm4TlvDq8ikWAM', // Default voice (e.g., Rachel)
  onTranscriptReceived,
  onError,
  welcomeMessage,
  onAudioLevelChange,
}: UseElevenlabsRealtimeProps): UseElevenlabsRealtimeReturn => {
  const [currentState, setCurrentState] = useState<ProcessingState>('idle');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState<boolean>(true);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0.5); // Default audio level

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]); // For collecting audio chunks
  const isRecordingRef = useRef<boolean>(false);
  const sttRequestInProgressRef = useRef<boolean>(false);
  const ttsSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const textToSendBuffer = useRef<string[]>([]);
  const cleanupCalledRef = useRef<boolean>(false);
  const strictModeDoubleInvokeRef = useRef<boolean>(false); // <-- Ref for Strict Mode
  const currentStateRef = useRef<ProcessingState>('idle'); // <-- Add direct state ref to bypass React's async updates
  const wsHealthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedWelcomeMessageRef = useRef<boolean>(false);
  const isAgentSpeakingRef = useRef<boolean>(false);
  
  // Create a synchronized setState function that updates both the React state and our ref
  const setSyncedState = useCallback((newState: ProcessingState) => {
    currentStateRef.current = newState; // Update ref immediately
    setCurrentState(newState); // Update React state (async)
    console.log(`State changed from ${currentState} to ${newState} (ref updated immediately)`);
  }, [currentState]);

  // --- Fetch API Key ---
  useEffect(() => {
    let isMounted = true; // Prevent state update on unmounted component
    setIsApiKeyLoading(true); // Ensure loading is true when effect runs
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/elevenlabs/credentials');
        if (!isMounted) return; // Exit if unmounted
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch API key: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        if (!isMounted) return; // Exit if unmounted
        if (!data.apiKey) {
            throw new Error('API key not found in response.');
        }
        setApiKey(data.apiKey);
      } catch (err: any) {
        if (!isMounted) return; // Exit if unmounted
        console.error("Error fetching ElevenLabs API key:", err);
        setSyncedState('error');
        onError?.(`Failed to get credentials: ${err.message}`);
      } finally {
        if (isMounted) {
          setIsApiKeyLoading(false); // <-- Set loading to false after fetch attempt
        }
      }
    };
    fetchApiKey();

    return () => {
      isMounted = false; // Cleanup function to set isMounted to false
    };
  }, [onError, setSyncedState]);

  // Initial state setup for clearer debugging
  useEffect(() => {
    // This ensures the ref matches our initial React state
    currentStateRef.current = currentState;
    console.log("Initial state sync:", { reactState: currentState, refState: currentStateRef.current });
  }, []);

  // --- Stop Session (Cleanup) ---
  const stopSession = useCallback(() => {
    if (cleanupCalledRef.current) return; // Already cleaned up
    cleanupCalledRef.current = true; // Mark as cleaning up

    console.log("Stopping ElevenLabs session (Cleanup)...", { 
      reactState: currentState, 
      refState: currentStateRef.current 
    });

    // Reset welcome message played flag
    hasPlayedWelcomeMessageRef.current = false;

    // Clear WebSocket health check interval FIRST
    if (wsHealthCheckIntervalRef.current) {
      clearInterval(wsHealthCheckIntervalRef.current);
      wsHealthCheckIntervalRef.current = null;
    }

    // Stop MediaRecorder & release mic
    if (mediaRecorderRef.current) {
      try { 
        // Clean up silence detection resources
        if ((mediaRecorderRef.current as any).silenceDetection) {
          const { interval, context, audioLevelCheck } = (mediaRecorderRef.current as any).silenceDetection;
          if (interval) clearInterval(interval);
          if (audioLevelCheck) audioLevelCheck();
          if (context) context.close().catch(e => console.warn("Error closing audio context:", e));
        }
        
        // Stop MediaRecorder if it's recording
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        
        // Release microphone tracks
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn("Error stopping MediaRecorder or tracks:", e);
      }
      mediaRecorderRef.current = null;
    }

    // Reset audio level
    setAudioLevel(0);

    // Reset audio chunks
    audioChunksRef.current = [];
    isRecordingRef.current = false;
    sttRequestInProgressRef.current = false;

    // Close WebSockets (TTS only)
    const closeWebSocket = (socketRef: React.MutableRefObject<WebSocket | null>, name: string) => {
        const socket = socketRef.current;
        if (socket) {
             // --> Check readyState before sending/closing <--
             if (socket.readyState === WebSocket.OPEN) {
                try {
                    console.log(`Sending EOS to ${name} WebSocket.`);
                    socket.send(JSON.stringify({})); // Send EOS
                    console.log(`Closing ${name} WebSocket (state OPEN).`);
                    socket.close();
                } catch (e) {
                    console.warn(`Error sending EOS or closing ${name} WebSocket (state OPEN):`, e);
                }
             } else if (socket.readyState === WebSocket.CONNECTING) {
                 console.log(`Closing ${name} WebSocket (state CONNECTING).`);
                 // Don't send EOS if only connecting
                 socket.close();
             } else {
                 console.log(`${name} WebSocket already closing or closed (state: ${socket.readyState}).`);
             }
             socketRef.current = null; // Clear ref regardless
        }
    }

    // Close TTS WebSocket only
    closeWebSocket(ttsSocketRef, "TTS");

    // Stop audio playback & clear queue
    if (sourceNodeRef.current) {
        try {
            sourceNodeRef.current.stop();
        } catch (e) { console.warn("Error stopping audio source node:", e); }
        sourceNodeRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    // Reset state
    setUserTranscript('');
    textToSendBuffer.current = [];
    setSyncedState('idle');
    // Reset cleanup flag slightly later to ensure state update propagates
    setTimeout(() => { cleanupCalledRef.current = false; }, 100);

    console.log("ElevenLabs session stopped.");
  }, [currentState, setSyncedState]);

  // --- Audio Playback Logic ---
  const playNextChunk = useCallback(() => {
    // Add console log to track each attempt
    console.log("[Audio Playback] playNextChunk called with queue size:", audioQueueRef.current.length);
    
    // Check if we have audio to play first
    if (audioQueueRef.current.length > 0) {
      // Force state to speaking to ensure playback starts
      console.log("[Audio Playback] Queue has audio, setting state to speaking");
      setSyncedState('speaking');
      
      // Reset cleanup flag to ensure playback
      cleanupCalledRef.current = false;
      
      // Prioritize audio playback by treating suspended context errors
      if (audioContextRef.current?.state === 'suspended') {
        console.log("[Audio Playback] AudioContext suspended, attempting to resume...");
        // Try to resume context and restart playback
        audioContextRef.current.resume()
          .then(() => {
            console.log("[Audio Playback] AudioContext resumed successfully");
            // Force restart of playback after context is resumed
            isPlayingRef.current = false;
            setTimeout(() => playNextChunk(), 100);
          })
          .catch(err => {
            console.error("[Audio Playback] Failed to resume AudioContext:", err);
            // Create dummy oscillator to force resume on Safari
            try {
              const oscillator = audioContextRef.current!.createOscillator();
              oscillator.frequency.value = 0; // silent
              oscillator.connect(audioContextRef.current!.destination);
              oscillator.start();
              oscillator.stop(audioContextRef.current!.currentTime + 0.001);
              console.log("[Audio Playback] Attempted context unlock with silent oscillator");
              // Try playback again after forcing context unlock
              setTimeout(() => playNextChunk(), 200);
            } catch (e) {
              console.error("[Audio Playback] Failed to create oscillator:", e);
            }
          });
        return;
      }
    }

    // After attempted recovery, check conditions again (using ref for immediate value check)
    if (currentStateRef.current === 'idle' || currentStateRef.current === 'error' || cleanupCalledRef.current) {
      // Add log with more details
      console.log("[Audio Playback] Skipping playback (State/Cleanup):", { 
        reactState: currentState,
        refState: currentStateRef.current, 
        cleanupCalled: cleanupCalledRef.current,
        audioQueueLength: audioQueueRef.current.length,
        isPlaying: isPlayingRef.current
      });
      
      // Don't clear the queue if we have audio and the state is idle - we might recover
      if (currentStateRef.current !== 'idle' || audioQueueRef.current.length === 0) {
        audioQueueRef.current = []; // Clear queue if stopping/error and no audio to play
      }
      
      isPlayingRef.current = false;
      return;
    }

    if (audioQueueRef.current.length === 0) {
      if (isPlayingRef.current) {
        // If the queue just became empty and we were playing, mark as no longer playing
        isPlayingRef.current = false;
        isAgentSpeakingRef.current = false; // Reset the speaking flag

        // Add a small delay before transitioning state to ensure all audio is finished
        console.log("[Audio Playback] Queue empty, delaying state transition to ensure audio finishes playing");
        
        setTimeout(() => {
          console.log("[Audio Playback] Transition delay complete, transitioning to WAITING mode");
          
          // Go to waiting state and stay there until user interacts
          setSyncedState('waiting');
          
          console.log("[Audio Playback] State transition complete - now in neutral waiting state");
        }, 300); // Small delay to ensure audio fully finishes
      }
      return;
    }

    if (isPlayingRef.current) {
      // Already playing, don't try to play another chunk
      console.log("[Audio Playback] Already playing - deferring new chunk");
      return;
    }

    // Reaching here means we're good to play audio
    console.log("[Audio Playback] Starting playback - Current state:", currentStateRef.current);
    isPlayingRef.current = true;
    isAgentSpeakingRef.current = true; // Set the speaking flag to prevent feedback
    setSyncedState('speaking');
    const audioChunk = audioQueueRef.current.shift();
    
    // Add log
    console.log(`[Audio Playback] Playing chunk. Queue size: ${audioQueueRef.current.length}, chunk size: ${audioChunk?.byteLength ?? 'unknown'} bytes`);

    // Create context if not exists
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log("[Audio Playback] Created new AudioContext for playback:", { 
          state: audioContextRef.current.state,
          sampleRate: audioContextRef.current.sampleRate
        });
        
        // Try to unlock audio
        const oscillator = audioContextRef.current.createOscillator();
        oscillator.connect(audioContextRef.current.destination);
        oscillator.start(0);
        oscillator.stop(0.001);
      } catch (e) {
        console.error("[Audio Playback] Failed to create AudioContext:", e);
        isPlayingRef.current = false;
        return;
      }
    }

    // Resume context if suspended
    if (audioContextRef.current.state === 'suspended') {
      console.log("[Audio Playback] Resuming suspended AudioContext");
      audioContextRef.current.resume().then(() => {
        console.log("[Audio Playback] AudioContext resumed for playback");
        // Requeue this chunk and try again
        if (audioChunk) {
          audioQueueRef.current.unshift(audioChunk);
        }
        isPlayingRef.current = false;
        setTimeout(playNextChunk, 50);
      }).catch(err => {
        console.error("[Audio Playback] Failed to resume AudioContext:", err);
        isPlayingRef.current = false;
      });
      return;
    }

    // Attempt to decode and play the audio if context is running
    if (audioChunk && audioContextRef.current && audioContextRef.current.state === 'running') {
      console.log("[Audio Playback] Decoding audio data...");
      
      try {
        // Use direct audioChunk decode
        audioContextRef.current.decodeAudioData(
          audioChunk,
          (buffer) => {
            // Process decoded buffer
            console.log("[Audio Playback] Successfully decoded audio buffer");
            playDecodedBuffer(buffer);
          },
          (decodeError) => {
            console.error('[Audio Playback] Error decoding audio data as-is:', decodeError);
            
            // If direct decoding fails, try to convert to MP3 format using mp3-decoder
            console.log("[Audio Playback] Attempting to decode audio with alternative method");
            
            try {
              // Create a new audio element and play via that (browser native decoder)
              const audio = new Audio();
              const blob = new Blob([audioChunk], { type: 'audio/mp3' });
              const url = URL.createObjectURL(blob);
              
              audio.src = url;
              audio.oncanplay = () => {
                console.log("[Audio Playback] Audio element ready to play");
                audio.play().then(() => {
                  console.log("[Audio Playback] Audio element playing");
                }).catch(e => {
                  console.error("[Audio Playback] Error playing via audio element:", e);
                });
              };
              
              audio.onended = () => {
                console.log("[Audio Playback] Audio element finished");
                URL.revokeObjectURL(url);
                isPlayingRef.current = false;
                setTimeout(() => playNextChunk(), 10);
              };
              
              audio.onerror = (e) => {
                console.error("[Audio Playback] Audio element error:", e);
                URL.revokeObjectURL(url);
                isPlayingRef.current = false;
                setTimeout(() => playNextChunk(), 10);
              };
            } catch (e) {
              console.error("[Audio Playback] Failed alternative playback method:", e);
              
              // Try to create a new AudioContext if we have a decode error
              try {
                console.log('[Audio Playback] Trying to create a new AudioContext after decode error');
                if (audioContextRef.current) {
                  audioContextRef.current.close().catch(e => 
                    console.error("[Audio Playback] Error closing AudioContext:", e));
                }
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              } catch (e) {
                console.error('[Audio Playback] Failed to create new AudioContext:', e);
              }
              
              isPlayingRef.current = false; // Allow next attempt
              setTimeout(() => playNextChunk(), 10); // Try next chunk
            }
          }
        );
      } catch (err) {
        console.error('[Audio Playback] Exception during decodeAudioData:', err);
        isPlayingRef.current = false;
        setTimeout(() => playNextChunk(), 100);
      }
    } else {
      // Add detailed log
      console.warn("[Audio Playback] Skipping chunk - Missing audio data, context not running, or context missing.", { 
        hasChunk: !!audioChunk, 
        chunkSize: audioChunk?.byteLength,
        contextExists: !!audioContextRef.current,
        contextState: audioContextRef.current?.state 
      });
      isPlayingRef.current = false;
      
      // If context wasn't running, maybe try again?
      if (audioChunk) audioQueueRef.current.unshift(audioChunk); // Put chunk back if context was issue
      
      // Attempt to play next if there was an issue but more chunks exist
      if(audioQueueRef.current.length > 0) setTimeout(() => playNextChunk(), 100);
    }
    
    // Helper function to play decoded buffer
    function playDecodedBuffer(buffer: AudioBuffer) {
      // Check again if we are still supposed to be playing
      if (!isPlayingRef.current || cleanupCalledRef.current) {
        // Add log
        console.log("[Audio Playback] Playback stopped/cancelled before source start.");
        isPlayingRef.current = false;
        return;
      }

      // Add log
      console.log("[Audio Playback] Audio decoded successfully:", {
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        numberOfChannels: buffer.numberOfChannels
      });
      
      try {
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current!.destination);
        source.onended = () => {
          // Check if this specific source finished or if we stopped externally
          if (sourceNodeRef.current === source) {
            // Add log
            console.log("[Audio Playback] Source node ended.");
            sourceNodeRef.current = null;
            isPlayingRef.current = false;
            // Schedule next chunk with a small delay
            setTimeout(() => playNextChunk(), 10);
          }
        };
        
        console.log("[Audio Playback] Starting audio source...");
        source.start();
        sourceNodeRef.current = source; // Track current node
        console.log("[Audio Playback] Audio source started successfully");
      } catch (e) {
        console.error("[Audio Playback] Error starting audio source:", e);
        sourceNodeRef.current = null;
        isPlayingRef.current = false;
        setTimeout(() => playNextChunk(), 10);
      }
    }
  }, [currentState, setSyncedState]);

  // --- WebSocket Setup (TTS) ---
  const setupTtsWebSocket = useCallback(() => {
    if (!apiKey || !voiceId) return; // Allow reconnection if socket is null
    
    // If there's an existing connection, close it first
    if (ttsSocketRef.current) {
      try {
        if (ttsSocketRef.current.readyState === WebSocket.OPEN) {
          console.log("Closing existing TTS WebSocket before creating a new one");
          ttsSocketRef.current.close();
        }
      } catch (e) {
        console.warn("Error closing existing WebSocket:", e);
      }
      ttsSocketRef.current = null; // Clear the ref regardless
    }

    console.log("Setting up TTS WebSocket...");
    console.log(`[Debug] Attempting direct connection to ElevenLabs`);

    try {
      // Connect directly to ElevenLabs using standard parameters 
      // (not using raw format to ensure compatibility)
      const ttsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_flash_v2_5&output_format=mp3_44100_128`;
      
      // Create the WebSocket
      const ttsSocket = new WebSocket(ttsUrl);
      
      // Store reference immediately to prevent race conditions
      ttsSocketRef.current = ttsSocket;
      
      // Initialize audio queue for this new websocket
      audioQueueRef.current = [];
      
      // Set up event handlers
      ttsSocket.onopen = () => {
        if (cleanupCalledRef.current) {
          console.log("WebSocket opened but cleanup was called - closing immediately");
          try { ttsSocket.close(); } catch (e) {}
          return;
        }
        
        console.log('TTS WebSocket opened.');
        
        // Send initial message with auth
        ttsSocket.send(JSON.stringify({
          text: " ", // Initial empty text
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          xi_api_key: apiKey // THIS IS CRUCIAL - include API key in message payload
        }));
        
        // Set state to speaking if we're in connecting state
        if (currentStateRef.current === 'connecting') {
          setSyncedState('speaking'); // Start in speaking state to handle welcome message
        }
        
        // Handle welcome message if any - IMMEDIATE SEND WITHOUT TIMEOUT
        if (welcomeMessage && !hasPlayedWelcomeMessageRef.current) {
          console.log("Sending welcome message now");
          try {
            // Mark welcome message as played FIRST to prevent repeat plays
            hasPlayedWelcomeMessageRef.current = true;
            
            // Send the welcome message immediately without a timeout
            ttsSocket.send(JSON.stringify({
              text: welcomeMessage + " ",
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
              xi_api_key: apiKey  // Include auth
            }));
            
            // The EOS message must be in a separate send call
            ttsSocket.send(JSON.stringify({
              text: "",
              xi_api_key: apiKey
            }));
            
            // Set speaking state
            setSyncedState('speaking');
            console.log("Welcome message sent successfully - will transition to neutral waiting state when done");
          } catch (err) {
            console.error("Error sending welcome message:", err);
            // On error, transition to waiting state, NOT listening
            setSyncedState('waiting');
          }
        } else if (textToSendBuffer.current.length > 0) {
          // If we have buffered text, send it now
          console.log("WebSocket connected, sending buffered text (count: " + textToSendBuffer.current.length + ")");
          const bufferCopy = [...textToSendBuffer.current]; // Create a copy
          textToSendBuffer.current = []; // Clear buffer
          
          // Use a timeout to ensure the socket is fully initialized
          setTimeout(() => {
            bufferCopy.forEach(text => {
              console.log("Sending buffered text to ElevenLabs: " + text.substring(0, 30) + "...");
              ttsSocket.send(JSON.stringify({
                text: text + " ", // Space needed for ElevenLabs
                xi_api_key: apiKey
              }));
            });
            
            // Send EOS to close the text stream
            ttsSocket.send(JSON.stringify({
              text: "",
              xi_api_key: apiKey
            }));
          }, 200);
        } else {
          // If no welcome message or buffered text, go to waiting state
          // But skip the transition to listening unless user interacts
          setTimeout(() => {
            setSyncedState('waiting');
          }, 300);
        }
      };
    
      // Message handler
      ttsSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Audio message
          if (message.audio) {
            const base64Audio = message.audio;
            // Log with basic info
            console.log(`Received base64 audio from ElevenLabs ${base64Audio ? {audioLength: base64Audio.length} : 'null'}`);
            
            // Force the state to speaking when audio is received, regardless of what state we think we're in
            if (currentStateRef.current !== 'speaking') {
              console.log(`State is ${currentStateRef.current} but audio received - updating to speaking state`);
              setSyncedState('speaking');
            }
            
            if (base64Audio) {
              // Convert the base64 audio to a buffer
              const binaryAudio = atob(base64Audio);
              const bytes = new Uint8Array(binaryAudio.length);
              for (let i = 0; i < binaryAudio.length; i++) {
                bytes[i] = binaryAudio.charCodeAt(i);
              }
              
              // Add the audio to the queue
              audioQueueRef.current.push(bytes.buffer);
              console.log(`Added audio to queue. Current queue length: ${audioQueueRef.current.length}`);
              
              // Kick off playback if not already playing
              if (!isPlayingRef.current) {
                console.log("Starting audio playback from base64 chunk");
                playNextChunk();
              }
            }
          }
          
          // Text message (usually for final indication)
          else if ('text' in message || message.isFinal) {
            console.log(`Received text message from WebSocket:`, message);
            
            // If this is the final message, transition to waiting state after all audio is played
            if (message.isFinal) {
              // Don't transition immediately - let the audio finish playing first
              // The state will transition in playNextChunk when the queue is empty
              setSyncedState('speaking'); // Ensure we're in speaking state
              
              // If the socket is still open, close it
              if (ttsSocketRef.current?.readyState === WebSocket.OPEN) {
                ttsSocketRef.current.close();
                ttsSocketRef.current = null;
              }
            }
          }
        } catch (err) {
          console.error(`Error processing WebSocket message:`, err);
          onError?.(`Error processing TTS response: ${(err as Error).message}`);
        }
      };
      
      // Error handler  
      ttsSocket.onerror = (event) => {
        console.error("TTS WebSocket error:", event);
        onError?.("TTS connection error");
        // Don't stop session on error, attempt to reconnect if needed
        if (textToSendBuffer.current.length > 0) {
          setTimeout(() => {
            if (!cleanupCalledRef.current) {
              console.log("Reconnecting WebSocket after error");
              setupTtsWebSocket();
            }
          }, 1000);
        }
      };

      // Close handler
      ttsSocket.onclose = (event) => {
        // Log closure details
        console.log(`TTS WebSocket closed: ${event.code} (${event.reason || 'no reason'})`);
        
        // Mark the socket as null right away to prevent race conditions
        ttsSocketRef.current = null;
        
        // Don't try to recover if we're not in an active state that needs recovery
        if (currentStateRef.current === 'idle' || 
            currentStateRef.current === 'error' || 
            cleanupCalledRef.current ||
            // Add this check to prevent automatic reconnections
            hasPlayedWelcomeMessageRef.current) {
          console.log("WebSocket closed, not reconnecting automatically");
          return;
        }
        
        // If we have audio to play, let it finish before transitioning state
        if (audioQueueRef.current.length > 0) {
          console.log(`WebSocket closed but audio queue not empty (${audioQueueRef.current.length} chunks) - continuing playback`);
          return;
        }
        
        // If we're in speaking state but have no more audio, force transition to listening
        if (currentStateRef.current === 'speaking') {
          console.log("WebSocket closed after speaking finished - FORCE transition to listening state");
          
          // Skip waiting state and go directly to listening
          setSyncedState('listening');
        }
      };
      
    } catch (error) {
      console.error("Failed to create TTS WebSocket:", error);
      setSyncedState('error');
      onError?.('Failed to initialize TTS connection');
      stopSession();
    }
  }, [apiKey, voiceId, welcomeMessage, onError, currentState, setSyncedState, stopSession]);

  // Helper to send text chunks to the TTS socket
  const sendTextToTtsSocket = useCallback((text: string) => {
    if (!text?.trim()) {
      console.log("Empty text received, not sending to TTS");
      return;
    }
    
    console.log(`Attempting to send text to TTS: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    
    // If socket is open, send directly
    if (ttsSocketRef.current?.readyState === WebSocket.OPEN) {
      try {
        // Update state to speaking
        setSyncedState('speaking');
        
        // Send the text with API key
        ttsSocketRef.current.send(JSON.stringify({
          text: text + " ", // Add trailing space per docs
          xi_api_key: apiKey,
        }));
        
        // Send EOS (required)
        ttsSocketRef.current.send(JSON.stringify({ 
          text: "",
          xi_api_key: apiKey,
        }));
        
        console.log("Text sent to TTS WebSocket successfully");
        return true; // Indicate success
      } catch (err) {
        console.error("Error sending to TTS WebSocket:", err);
        return false; // Indicate failure
      }
    } 
    // Otherwise report socket not ready
    else {
      console.log("WebSocket not ready for sending, text should be buffered", {
        socketExists: !!ttsSocketRef.current,
        readyState: ttsSocketRef.current?.readyState
      });
      return false; // Indicate socket wasn't ready
    }
  }, [apiKey, setSyncedState]);

  // --- Handle Speech Recognition using REST API (Fix state transition) ---
  const processAudioForSpeechRecognition = useCallback(async (audioBlob: Blob) => {
    if (!apiKey || sttRequestInProgressRef.current) return;
    
    try {
      sttRequestInProgressRef.current = true;
      setSyncedState('processing');
      
      // First, use audio isolation to clean up the audio
      console.log('Applying audio isolation to filter background noise...');
      let cleanedAudioBlob = audioBlob;
      
      try {
        // Create form data for the isolation request
        const isolationForm = new FormData();
        isolationForm.append('audio', audioBlob, 'recording.webm');
        
        // Send to our audio isolation proxy endpoint
        const isolationResponse = await fetch(AUDIO_ISOLATION_URL, {
          method: 'POST',
          body: isolationForm,
        });
        
        if (isolationResponse.ok) {
          // Get the isolated audio back as a blob
          const isolatedAudioBuffer = await isolationResponse.arrayBuffer();
          cleanedAudioBlob = new Blob([isolatedAudioBuffer], { type: 'audio/webm;codecs=opus' });
          console.log('Successfully isolated voice from background noise', {
            originalSize: audioBlob.size,
            cleanedSize: cleanedAudioBlob.size
          });
        } else {
          // If isolation fails, just use the original audio
          console.warn('Audio isolation failed, using original audio:', await isolationResponse.text());
        }
      } catch (isolationError) {
        console.error('Error during audio isolation:', isolationError);
        // Continue with original audio if isolation fails
      }
      
      // Create form data with the cleaned audio
      const formData = new FormData();
      
      // Use a proper audio/webm MIME type - important for server handling
      formData.append('file', cleanedAudioBlob, 'audio.webm');
      formData.append('model_id', STT_MODEL);
      
      console.log('Sending isolated audio for STT processing...', { 
        size: cleanedAudioBlob.size, 
        type: cleanedAudioBlob.type 
      });
      
      // Send to our proxy endpoint
      const response = await fetch(STT_REST_API_URL, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errorMsg = '';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.details || `Status ${response.status}`;
        } catch (e) {
          errorMsg = `Status ${response.status}: ${response.statusText}`;
        }
        throw new Error(`STT API error: ${errorMsg}`);
      }
      
      const result = await response.json();
      
      // Process the transcription result
      if (result.text) {
        console.log("STT API Result:", result.text);
        onTranscriptReceived(result.text, true);
        setUserTranscript(''); // Clear interim transcript
        
        // Stay in processing state until AI responds - don't transition!
        console.log("Staying in PROCESSING state until AI responds");
      } else {
        console.warn("STT API returned no text:", result);
        // If no text, go back to listening right away
        console.log("No text from STT, returning to LISTENING state");
        setSyncedState('listening');
      }
      
      // Ensure we have a valid WebSocket connection after processing speech
      if (!ttsSocketRef.current || ttsSocketRef.current.readyState !== WebSocket.OPEN) {
        console.log("After STT: TTS WebSocket not ready, reconnecting...");
        setupTtsWebSocket();
      }
      
    } catch (error) {
      console.error('Error processing speech:', error);
      setSyncedState('error');
      onError?.(`Speech recognition error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stopSession();
      
      // On error, go back to listening
      console.log("Error in STT processing, returning to LISTENING state");
      setSyncedState('listening');
    } finally {
      sttRequestInProgressRef.current = false;
    }
  }, [apiKey, onError, onTranscriptReceived, setSyncedState, stopSession, setupTtsWebSocket]);

  // --- Setup Audio Recording ---
  const setupAudioRecording = useCallback(async () => {
    // If already recording, don't try to set up again
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log("Already recording, skipping setupAudioRecording");
      return;
    }
    
    console.log("Setting up audio recording...");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        } 
      });
      
      // Set up audio analyzer for silence detection
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioSource.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let silenceStartTime: number | null = null;
      let speechTimeoutId: NodeJS.Timeout | null = null;
      let isSpeakingRef = { current: false };
      let audioLevelTimeout: number | null = null;
      
      // Function to check audio levels and update state
      const checkAudioLevels = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        // Emphasize frequencies in human speech range (approximately 300Hz to 3400Hz)
        // Given FFT size of 256, we'll focus on a subset of the frequency bins
        const startBin = Math.floor(300 / (audioContext.sampleRate / analyser.fftSize));
        const endBin = Math.floor(3400 / (audioContext.sampleRate / analyser.fftSize));
        
        // Calculate weighted average with emphasis on speech frequencies
        let weightedSum = 0;
        let totalWeight = 0;
        for (let i = 0; i < bufferLength; i++) {
          // Apply higher weight to speech frequencies
          const weight = (i >= startBin && i <= endBin) ? 2.0 : 0.5;
          weightedSum += dataArray[i] * weight;
          totalWeight += weight;
          
          // Also calculate regular sum for comparison
          sum += dataArray[i];
        }
        
        // Calculate both normalized averages
        const average = sum / bufferLength;
        const normalizedRegular = average / 255; // Regular normalize to 0-1
        
        const weightedAverage = weightedSum / totalWeight;
        const normalizedWeighted = weightedAverage / 255; // Weighted normalize to 0-1
        
        // Use the weighted version which should be more sensitive to speech
        const finalLevel = normalizedWeighted;
        
        // Send the audio level update
        setAudioLevel(finalLevel);
        if (onAudioLevelChange) {
          onAudioLevelChange(finalLevel);
        }
        
        // Occasionally log detailed audio analysis for debugging
        if (Math.random() < 0.01) { // Log roughly 1% of the time
          console.log(`[Audio Analysis] Regular: ${normalizedRegular.toFixed(3)}, Weighted: ${normalizedWeighted.toFixed(3)}, Final: ${finalLevel.toFixed(3)}`);
        }
        
        // Schedule the next check
        audioLevelTimeout = window.setTimeout(checkAudioLevels, 50); // Check levels frequently (20 times per second)
      };
      
      // Start checking audio levels
      checkAudioLevels();
      
      // Function to check if audio is silent - improved version with speech detection
      const checkSilence = () => {
        // If agent is speaking, don't process audio to prevent feedback
        if (isAgentSpeakingRef.current) return;
        
        // If we're in waiting state and detect audio, transition to listening
        if (currentStateRef.current === 'waiting') {
          // Analyze audio to see if user might be speaking
          analyser.getByteFrequencyData(dataArray);
          
          // Apply frequency weighting for human speech (focus on 300Hz-3400Hz range)
          const startBin = Math.floor(300 / (audioContext.sampleRate / analyser.fftSize));
          const endBin = Math.floor(3400 / (audioContext.sampleRate / analyser.fftSize));
          
          // Calculate weighted average with emphasis on speech frequencies
          let weightedSum = 0;
          let totalWeight = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            // Apply higher weight to speech frequencies
            const weight = (i >= startBin && i <= endBin) ? 2.5 : 0.2;
            weightedSum += dataArray[i] * weight;
            totalWeight += weight;
          }
          
          const weightedAverage = weightedSum / totalWeight;
          const normalizedLevel = weightedAverage / 255; // Normalize to 0-1
          
          // If audio level exceeds threshold in waiting state, transition to listening
          if (normalizedLevel > SILENCE_THRESHOLD * 1.5) { // Use higher threshold for initial detection
            console.log(`Detected initial user audio (${normalizedLevel.toFixed(3)}) while in waiting state, transitioning to LISTENING`);
            setSyncedState('listening');
            return; // Exit after state change to allow next cycle to handle listening state properly
          }
          
          return; // Don't continue processing if still in waiting state
        }
        
        // Only process further silence detection in listening state
        if (currentStateRef.current !== 'listening') return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Apply frequency weighting for human speech (focus on 300Hz-3400Hz range)
        const startBin = Math.floor(300 / (audioContext.sampleRate / analyser.fftSize));
        const endBin = Math.floor(3400 / (audioContext.sampleRate / analyser.fftSize));
        
        // Calculate weighted average with emphasis on speech frequencies
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          // Apply higher weight to speech frequencies
          const weight = (i >= startBin && i <= endBin) ? 2.5 : 0.2; // More emphasis on speech frequencies
          weightedSum += dataArray[i] * weight;
          totalWeight += weight;
        }
        
        const weightedAverage = weightedSum / totalWeight;
        const normalizedLevel = weightedAverage / 255; // Normalize to 0-1
        
        // Use running average with exponential decay for smoother transitions
        if (!silenceDetectionRef.levels) {
          silenceDetectionRef.levels = [];
        }
        
        // Add current level and keep only last 3
        silenceDetectionRef.levels.push(normalizedLevel);
        if (silenceDetectionRef.levels.length > 3) {
          silenceDetectionRef.levels.shift();
        }
        
        // Calculate average level with more weight on recent samples
        const weights = [0.2, 0.3, 0.5]; // More weight to recent samples
        let weightedSum2 = 0;
        let totalWeight2 = 0;
        for (let i = 0; i < silenceDetectionRef.levels.length; i++) {
          const idx = silenceDetectionRef.levels.length - 1 - i; // Start from most recent
          const weight = weights[i] || 0;
          weightedSum2 += silenceDetectionRef.levels[idx] * weight;
          totalWeight2 += weight;
        }
        const avgLevel = totalWeight2 > 0 ? weightedSum2 / totalWeight2 : normalizedLevel;
        
        // Debug log (occasionally)
        if (Math.random() < 0.01) {
          console.log(`Silence detection: level=${avgLevel.toFixed(3)}, ` +
                      `threshold=${SILENCE_THRESHOLD}, ` +
                      `isSpeaking=${isSpeakingRef.current}`);
        }

        // If audio is silent and we were speaking, start silence timer
        if (avgLevel < SILENCE_THRESHOLD && isSpeakingRef.current) {
          if (silenceStartTime === null) {
            silenceStartTime = Date.now();
            console.log('Silence detected, starting silence timer');
          } else if (Date.now() - silenceStartTime > SILENCE_DURATION_MS) {
            // Silence longer than threshold, stop recording
            console.log('Auto-stopping recording due to silence duration reached', { 
              silenceDuration: Date.now() - silenceStartTime,
              avgLevel,
              threshold: SILENCE_THRESHOLD
            });
            silenceStartTime = null;
            isSpeakingRef.current = false;
            
            if (speechTimeoutId) {
              clearTimeout(speechTimeoutId);
              speechTimeoutId = null;
            }
            
            // Force stop recording
            if (mediaRecorderRef.current?.state === 'recording') {
              console.log('Stopping recording due to silence');
              mediaRecorderRef.current.stop();
            }
          }
        } 
        // If audio is not silent, reset silence timer
        else if (avgLevel >= SILENCE_THRESHOLD) {
          // If we were tracking silence, reset it
          if (silenceStartTime !== null) {
            console.log('Speech resumed, resetting silence timer');
            silenceStartTime = null;
          }
          
          // Only count as speaking if level is consistently above threshold
          if (!isSpeakingRef.current) {
            if (!silenceDetectionRef.speakingStartTime) {
              silenceDetectionRef.speakingStartTime = Date.now();
            } else if (Date.now() - silenceDetectionRef.speakingStartTime > MIN_SPEECH_DURATION_MS) {
              // Sustained speech detected
              isSpeakingRef.current = true;
              silenceDetectionRef.speakingStartTime = null;
              console.log('Voice activity confirmed, marking as speaking', { 
                level: avgLevel,
                threshold: SILENCE_THRESHOLD
              });
              
              // Set speech timeout (max duration of a single utterance)
              if (speechTimeoutId) clearTimeout(speechTimeoutId);
              speechTimeoutId = setTimeout(() => {
                console.log('Auto-stopping recording due to maximum speech duration reached', { 
                  maxDuration: SPEECH_TIMEOUT_MS 
                });
                if (mediaRecorderRef.current?.state === 'recording') {
                  mediaRecorderRef.current.stop();
                }
              }, SPEECH_TIMEOUT_MS);
            }
          } else {
            // Already speaking, reset speaking start time
            silenceDetectionRef.speakingStartTime = null;
          }
        } else {
          // Between thresholds, continue what we were doing
          // but reset speech start time if we weren't already speaking
          if (!isSpeakingRef.current) {
            silenceDetectionRef.speakingStartTime = null;
          }
        }
      };
      
      // Set up periodic silence check
      const silenceCheckInterval = setInterval(checkSilence, 100); // Check every 100ms
      
      // Store the interval ID for cleanup
      const silenceDetectionRef = { 
        interval: silenceCheckInterval, 
        context: audioContext,
        audioLevelCheck: () => {
          if (audioLevelTimeout) {
            window.clearTimeout(audioLevelTimeout);
            audioLevelTimeout = null;
          }
        },
        levels: [] as number[], // Store recent audio levels for average calculation
        speakingStartTime: null as number | null // Track when speech potentially started
      };
      
      // Create media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: AUDIO_BIT_RATE
      });
      
      // Track recording start time for minimum duration check
      let recordingStartTime = Date.now();
      let totalAudioSize = 0;
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Only accumulate chunks if not agent speaking (prevents feedback)
          if (!isAgentSpeakingRef.current) {
            audioChunksRef.current.push(event.data);
            totalAudioSize += event.data.size;
            console.log(`Received audio chunk: ${event.data.size} bytes (total: ${totalAudioSize} bytes)`);
          }
        }
      };
      
      mediaRecorderRef.current.onstart = () => {
        console.log('MediaRecorder started - FORCING state to listening.');
        audioChunksRef.current = []; // Clear previous chunks
        isRecordingRef.current = true;
        recordingStartTime = Date.now();
        totalAudioSize = 0;
        
        // Force state to listening to ensure UI is correct
        setSyncedState('listening');
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('MediaRecorder stopped.');
        isRecordingRef.current = false;
        
        // Reset silence detection
        silenceStartTime = null;
        if (speechTimeoutId) {
          clearTimeout(speechTimeoutId);
          speechTimeoutId = null;
        }
        
        // Don't process audio if agent is speaking (prevents feedback)
        if (isAgentSpeakingRef.current) {
          console.log('Agent is speaking, ignoring recorded audio to prevent feedback');
          audioChunksRef.current = []; // Clear the audio chunks
          return;
        }
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          console.log(`Total audio collected: ${audioBlob.size} bytes`);
          
          // Only process if enough audio data and minimum recording time
          const recordingDuration = Date.now() - recordingStartTime;
          const hasMinSize = audioBlob.size >= MIN_AUDIO_SIZE_BYTES;
          const hasMinDuration = recordingDuration >= MIN_RECORDING_TIME_MS;
          
          if (hasMinSize && hasMinDuration) {
            console.log(`Audio meets requirements: size=${audioBlob.size}B, duration=${recordingDuration}ms`);
            processAudioForSpeechRecognition(audioBlob);
          } else {
            console.log('Audio too short, returning to waiting state', { 
              size: audioBlob.size,
              minSize: MIN_AUDIO_SIZE_BYTES,
              duration: recordingDuration,
              minDuration: MIN_RECORDING_TIME_MS
            });
            
            // If audio was too short, go to waiting state instead of restarting recording
            setSyncedState('waiting');
          }
        } else {
          // No audio collected, go to waiting state
          setSyncedState('waiting');
        }
      };
      
      mediaRecorderRef.current.onerror = (event: Event) => {
        console.error('MediaRecorder error:', (event as any).error || event);
        setSyncedState('error');
        onError?.('Microphone recording error.');
        stopSession();
      };
      
      // Store the silence detection refs for cleanup
      (mediaRecorderRef.current as any).silenceDetection = silenceDetectionRef;
      
      // Start in listening state immediately when setting up recording
      setSyncedState('listening');
      
      // Start recording immediately to detect voice activity
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.start(500); // Collect chunks every 500ms
        console.log('Audio recording started immediately after setup.');
      }
      
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setSyncedState('error');
      onError?.(`Microphone access failed: ${err.message}`);
      stopSession();
    }
  }, [onError, processAudioForSpeechRecognition, stopSession, setSyncedState, onAudioLevelChange]);

  // --- Public Methods ---
  const startSession = useCallback(() => {
    console.log("Starting ElevenLabs session...");
    
    if (cleanupCalledRef.current || currentState === 'connecting') {
      console.log(`Session start skipped - already ${cleanupCalledRef.current ? 'cleaning up' : 'connecting'}`);
      return;
    }

    // Reset welcome message flag on each new session
    hasPlayedWelcomeMessageRef.current = false;
    
    if (!apiKey) {
        console.error("Cannot start session, API key not available.");
        setSyncedState('error');
        onError?.("API key not loaded. Cannot start session.");
        return;
    }
    console.log("Starting ElevenLabs session...");
    cleanupCalledRef.current = false; // Reset cleanup flag
    setSyncedState('connecting');

    // Unlock audio context for mobile browsers
    const unlockAudio = async () => {
      console.log("Audio unlocked via user interaction");
      
      // Create audio context if needed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          console.log("AudioContext created/recreated.", audioContextRef.current);
        } catch (e) {
          console.error("Error creating AudioContext:", e);
          return;
        }
      }
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log("AudioContext resumed from suspended state");
        } catch (e) {
          console.error("Error resuming AudioContext:", e);
        }
      }
    };
    
    // Try to unlock audio
    unlockAudio().catch(e => {
      console.error("Error unlocking audio:", e);
    });
    
    // Change state to connecting
    setSyncedState('connecting');
    
    // Set up TTS WebSocket
    setupTtsWebSocket();
    
    // Start WebSocket health check interval with a longer delay
    if (wsHealthCheckIntervalRef.current) {
      clearInterval(wsHealthCheckIntervalRef.current);
    }
    
    wsHealthCheckIntervalRef.current = setInterval(() => {
      checkWebSocketHealth();
    }, 10000); // Check every 10 seconds instead of 3
    
    // Then set up audio recording with a slight delay
    setTimeout(() => {
      setupAudioRecording();
    }, 1000);
  }, [currentState, apiKey, setupAudioRecording, setupTtsWebSocket, onError, stopSession, setSyncedState]);

  // Public method to manually stop recording and process the audio
  const stopRecording = useCallback(() => {
    if (currentState !== 'listening' || !mediaRecorderRef.current) {
      console.warn('Cannot stop recording - not currently recording or no recorder');
      return;
    }
    
    console.log('Manually stopping recording...');
    try {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch (error) {
      console.error('Error stopping MediaRecorder:', error);
    }
  }, [currentState]);

  // Public method to send text for synthesis
  const sendTextToSpeak = useCallback((text: string) => {
    if (!text || text.trim().length === 0) {
      return; // Don't send empty text
    }

    console.log("Request to speak text received, current state:", currentStateRef.current);
    
    // Block if we're cleaning up or in error state
    if (cleanupCalledRef.current || currentStateRef.current === 'error') {
      console.warn(`Cannot send text to speak, cleanup: ${cleanupCalledRef.current}, state: ${currentStateRef.current}`);
      return;
    }

    // Add text to buffer
    textToSendBuffer.current.push(text);

    // Force transitiont to speaking state while sending text
    if (currentStateRef.current !== 'speaking') {
      console.log(`State is ${currentStateRef.current} but transitioning to speaking for TTS`);
      setSyncedState('speaking');
    }
    
    const processTtsWithValidSocket = () => {
      // If socket is ready, send text
      if (ttsSocketRef.current?.readyState === WebSocket.OPEN) {
        console.log("WebSocket is open, sending text directly");
        // Process all buffered texts
        const bufferCopy = [...textToSendBuffer.current]; // Create a copy to avoid mutation issues
        textToSendBuffer.current = []; // Clear buffer
        
        // Ensure we're in speaking state
        setSyncedState('speaking');
        
        // Attempt to send each text
        bufferCopy.forEach((textToSend) => {
          if (!sendTextToTtsSocket(textToSend)) {
            // If sending failed, put it back in the buffer
            console.log("Failed to send text, adding back to buffer:", textToSend.substring(0, 20));
            textToSendBuffer.current.push(textToSend);
          }
        });
      }
      // If no socket or socket closed, reconnect
      else {
        console.log("WebSocket not ready, setting up new connection");
        setupTtsWebSocket();
        
        // Try to send after a delay to allow connection to establish
        setTimeout(() => {
          if (ttsSocketRef.current?.readyState === WebSocket.OPEN) {
            console.log("WebSocket now ready, sending buffered text");
            const bufferCopy = [...textToSendBuffer.current];
            textToSendBuffer.current = [];
            
            // Ensure we're in speaking state
            setSyncedState('speaking');
            
            bufferCopy.forEach((textToSend) => {
              sendTextToTtsSocket(textToSend);
            });
          } else {
            console.log("WebSocket still not ready after delay - text remains in buffer");
          }
        }, 500);
      }
      
      // After sending text, we'll automatically transition to listening when audio finishes
      console.log("After sending text, will automatically transition to listening when audio finishes");
    };
    
    // Force state to speaking and process text
    if (currentStateRef.current === 'idle') {
      console.log("In idle state, starting session first");
      startSession();
      
      // Try to send text after session starts
      setTimeout(() => {
        processTtsWithValidSocket();
      }, 1000);
    } else {
      // Process text immediately
      processTtsWithValidSocket();
    }
  }, [sendTextToTtsSocket, setSyncedState, startSession, setupTtsWebSocket]);

  // Add a WebSocket health check function 
  const checkWebSocketHealth = useCallback(() => {
    // Only check when we're supposed to be in a state that requires the WebSocket
    if (currentStateRef.current === 'idle' || currentStateRef.current === 'error' || cleanupCalledRef.current) {
      return;
    }
    
    // IMPORTANT: Only reconnect in very specific situations to avoid loops
    // 1. Never reconnect during speaking or processing states
    // 2. Only reconnect when we need to send text but can't
    if (currentStateRef.current === 'speaking' || currentStateRef.current === 'processing') {
      return; // Don't reconnect during these states
    }
    
    // Only reconnect if we have text to send but no socket
    const hasTextToSend = textToSendBuffer.current.length > 0;
    const socketNotAvailable = !ttsSocketRef.current || ttsSocketRef.current.readyState !== WebSocket.OPEN;
    
    // Log the check with detailed state (but less frequently)
    if (Math.random() < 0.1) { // Only log 10% of checks to reduce noise
      const checkDetails = {
        textBufferSize: textToSendBuffer.current.length,
        state: currentStateRef.current,
        socketExists: !!ttsSocketRef.current,
        socketState: ttsSocketRef.current?.readyState !== undefined ? 
          ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][ttsSocketRef.current.readyState] : 
          undefined
      };
      console.log("WebSocket health check ran", checkDetails);
    }
    
    // Only reconnect if we need to send text
    if (hasTextToSend && socketNotAvailable) {
      console.log("WebSocket health check: Text to send but no socket - reconnecting", {
        textBufferSize: textToSendBuffer.current.length,
        state: currentStateRef.current
      });
      setupTtsWebSocket();
    }
  }, [currentStateRef, cleanupCalledRef, setupTtsWebSocket]);

  // --- Cleanup on Unmount ---
  useEffect(() => {
    // Create a unique instance ID for this component instance
    const instanceId = Math.random().toString(36).substring(2, 15);
    
    // Use localStorage to track instances across renders for Strict Mode detection
    const strictModeKey = `elevenlabs_strictmode_${chatbotId}`;
    const prevInstance = localStorage.getItem(strictModeKey);
    
    if (!prevInstance) {
      // No previous instance, this is first mount or real mount after unmount
      localStorage.setItem(strictModeKey, instanceId);
      console.log("First mount or new mount after real unmount", { instanceId });
    } else if (prevInstance !== instanceId) {
      // Different instance ID but key exists - this is Strict Mode's second mount
      console.log("Strict Mode second mount detected", { prevInstance, instanceId });
      // Update the instance ID
      localStorage.setItem(strictModeKey, instanceId);
    }
    
    // Track that this component is mounted
    const isMounted = { current: true };

    // Create a WebSocket health check function
    const checkWebSocketHealth = () => {
      // Check if there's audio in the queue but nothing is playing
      if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
        console.log("WebSocket health check: Audio in queue but not playing, restarting playback");
        
        // If state is idle but we have audio, change state
        if (currentStateRef.current === 'idle') {
          console.log("WebSocket health check: State is idle but audio in queue, changing to speaking");
          setSyncedState('speaking');
        }
        
        // If cleanup flag is set but we have audio, reset it
        if (cleanupCalledRef.current) {
          console.log("WebSocket health check: Cleanup flag set but audio in queue, resetting flag");
          cleanupCalledRef.current = false;
        }
        
        // Force playback if we have audio in queue
        setTimeout(() => playNextChunk(), 50);
      }

      // If we have text to send but no WebSocket connection
      const needsReconnection = (
        (textToSendBuffer.current.length > 0 || 
         currentStateRef.current === 'listening' || 
         currentStateRef.current === 'speaking') && 
        (!ttsSocketRef.current || ttsSocketRef.current.readyState === WebSocket.CLOSED)
      );
      
      // If we need to reconnect, do it
      if (needsReconnection) {
        console.log("WebSocket health check: Connection needed, reconnecting...", {
          textBufferSize: textToSendBuffer.current.length,
          state: currentStateRef.current,
          socketExists: !!ttsSocketRef.current,
          socketState: ttsSocketRef.current?.readyState
        });
        setupTtsWebSocket();
      }
    };

    // Set up a keep-alive interval for the WebSocket connection
    const keepAliveInterval = setInterval(() => {
      // Only send keep-alive if WebSocket is open and we're in an active state
      if (ttsSocketRef.current?.readyState === WebSocket.OPEN && 
          (currentStateRef.current === 'listening' || currentStateRef.current === 'speaking')) {
        try {
          // Send a space character to keep the connection alive (per ElevenLabs docs)
          ttsSocketRef.current.send(JSON.stringify({
            text: " ",
            xi_api_key: apiKey
          }));
          console.log("Sent WebSocket keep-alive ping");
        } catch (err) {
          console.warn("Error sending keep-alive ping:", err);
        }
      }
      
      // Check if we need to reconnect the WebSocket
      if ((currentStateRef.current === 'listening' || currentStateRef.current === 'speaking') && 
          (!ttsSocketRef.current || ttsSocketRef.current.readyState === WebSocket.CLOSED)) {
        console.log("WebSocket check interval: Connection needed, reconnecting...");
        setupTtsWebSocket();
      }
    }, 15000); // Every 15 seconds

    // Set up a more frequent health check for WebSocket and audio playback
    const healthCheckInterval = setInterval(checkWebSocketHealth, 2000); // Every 2 seconds

    return () => {
        // Mark as unmounted first
        isMounted.current = false;
        
        // Clear intervals
        clearInterval(keepAliveInterval);
        clearInterval(healthCheckInterval);
        
        // Check if this is a Strict Mode unmount
        const currentInstance = localStorage.getItem(strictModeKey);
        const isStrictModeUnmount = currentInstance === instanceId;
        
        if (isStrictModeUnmount) {
          // This is the first unmount in Strict Mode - preserve the instance ID
          console.log("Strict Mode unmount detected - skipping cleanup", { instanceId });
        } else {
          // This is a real unmount - clear the instance ID
          localStorage.removeItem(strictModeKey);
          console.log("Real unmount detected - cleaning up", { instanceId });
          
          // Run cleanup
          stopSession();
          
          // Ensure AudioContext is closed on final unmount
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => 
              console.error("Error closing AudioContext on unmount:", e));
            audioContextRef.current = null;
          }
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No dependencies to avoid re-running this effect

  return {
    currentState,
    isApiKeyLoading,
    startSession,
    stopSession,
    stopRecording,
    sendTextToSpeak,
    userTranscript,
    audioLevel,
  };
}; 