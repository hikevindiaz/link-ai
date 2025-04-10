import { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants ---
const STT_WEBSOCKET_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/stream';
const TTS_WEBSOCKET_URL = 'wss://api.elevenlabs.io/v1/text-to-speech'; // Base URL, voice ID needed
const AUDIO_BIT_RATE = 128 * 1024; // 128 kbps
const AUDIO_SAMPLE_RATE = 16000; // 16 kHz for STT, common for telephony
const STT_MODEL = 'eleven_multilingual_v2'; // Example model, make configurable if needed

// --- Types ---
type ProcessingState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

interface UseElevenlabsRealtimeProps {
  chatbotId: string; // Needed for context potentially
  voiceId?: string; // Specific ElevenLabs voice ID for the chatbot
  onTranscriptReceived: (transcript: string, isFinal: boolean) => void; // Callback for STT results
  onError?: (error: string) => void; // Callback for errors
}

interface UseElevenlabsRealtimeReturn {
  currentState: ProcessingState;
  isApiKeyLoading: boolean;
  startSession: () => void;
  stopSession: () => void;
  sendTextToSpeak: (text: string) => void; // Function to send text for TTS
  userTranscript: string; // Live user transcript (interim)
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
}: UseElevenlabsRealtimeProps): UseElevenlabsRealtimeReturn => {
  const [currentState, setCurrentState] = useState<ProcessingState>('idle');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyLoading, setIsApiKeyLoading] = useState<boolean>(true);
  const [userTranscript, setUserTranscript] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sttSocketRef = useRef<WebSocket | null>(null);
  const ttsSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const textToSendBuffer = useRef<string[]>([]); // Buffer for text waiting for TTS connection
  const cleanupCalledRef = useRef<boolean>(false); // Prevent multiple cleanups

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
        setCurrentState('error');
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
  }, [onError]);

  // --- Stop Session (Cleanup) ---
  const stopSession = useCallback(() => {
    if (cleanupCalledRef.current) return; // Already cleaned up
    cleanupCalledRef.current = true; // Mark as cleaning up

    console.log("Stopping ElevenLabs session (Cleanup)...", { currentState });

    // Stop MediaRecorder & release mic
    if (mediaRecorderRef.current) {
        try { // Add try-catch around recorder operations
            if (mediaRecorderRef.current.state === 'recording') { // Check state before stopping
                mediaRecorderRef.current.stop();
            }
            mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
        } catch (e) {
            console.warn("Error stopping MediaRecorder or tracks:", e);
        }
        mediaRecorderRef.current = null;
    }

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

    // Close WebSockets
    closeWebSocket(sttSocketRef, "STT");
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

    // Close AudioContext if it exists and is not already closed
    // Debatable if needed here, maybe only on unmount
    // if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
    //     audioContextRef.current.close().catch(e => console.error("Error closing AudioContext during stopSession:", e));
    //     audioContextRef.current = null;
    // }

    // Reset state
    setUserTranscript('');
    textToSendBuffer.current = [];
    setCurrentState('idle');
    // Reset cleanup flag slightly later to ensure state update propagates
    setTimeout(() => { cleanupCalledRef.current = false; }, 100);

    console.log("ElevenLabs session stopped.");
  }, [currentState]); // Include currentState to log it, but be careful of loops if state changes trigger it


  // --- Audio Playback Logic ---
  const playNextChunk = useCallback(() => {
    // Prevent playback if session is stopping or in error state
    if (currentState === 'idle' || currentState === 'error' || cleanupCalledRef.current) {
        // Add log
        console.log("[Audio Playback] Skipping playback (State/Cleanup):", { currentState, cleanupCalled: cleanupCalledRef.current });
        audioQueueRef.current = []; // Clear queue if stopping/error
        isPlayingRef.current = false;
        return;
    }

    if (audioQueueRef.current.length === 0 || isPlayingRef.current) {
      if(audioQueueRef.current.length === 0 && isPlayingRef.current) {
        // If the queue just became empty and we were playing, mark as no longer playing
        isPlayingRef.current = false;
        // Only revert to listening if not processing/connecting/etc.
        setCurrentState(prev => (prev === 'speaking' ? 'listening' : prev));
        // Add log
        console.log("[Audio Playback] Queue empty, finished playing.");
      }
      return;
    }

    isPlayingRef.current = true;
    setCurrentState('speaking');
    const audioChunk = audioQueueRef.current.shift();
    // Add log
    console.log(`[Audio Playback] Attempting to play chunk. Queue size: ${audioQueueRef.current.length}`);

    if (audioChunk && audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.decodeAudioData(audioChunk,
        (buffer) => {
          // Check again if we are still supposed to be playing
          if (!isPlayingRef.current || cleanupCalledRef.current) {
              // Add log
              console.log("[Audio Playback] Playback stopped/cancelled before source start.");
              return;
          }

          // Add log
          console.log("[Audio Playback] Audio decoded successfully. Playing...");
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
                playNextChunk(); // Play next chunk if available
             }
          };
          source.start();
          sourceNodeRef.current = source; // Track current node
        },
        (decodeError) => {
          // Add log
          console.error('[Audio Playback] Error decoding audio data:', decodeError);
          isPlayingRef.current = false; // Allow next attempt
          playNextChunk(); // Try next chunk
        }
      );
    } else {
      // Add detailed log
      console.warn("[Audio Playback] Skipping chunk - Missing audio data, context not running, or context missing.", { hasChunk: !!audioChunk, contextState: audioContextRef.current?.state });
      isPlayingRef.current = false;
      // If context wasn't running, maybe try again?
      if (audioChunk) audioQueueRef.current.unshift(audioChunk); // Put chunk back if context was issue
      // Attempt to play next if there was an issue but more chunks exist
      if(audioQueueRef.current.length > 0) setTimeout(playNextChunk, 100);
    }
  }, [currentState]); // Added currentState


  // --- WebSocket Setup (STT) ---
  const setupSttWebSocket = useCallback(() => {
    if (!apiKey || !voiceId || sttSocketRef.current) return;

    console.log("Setting up STT WebSocket...");
    console.log(`[Debug] Attempting STT connection (Key in BOS only): ${apiKey ? apiKey.substring(0, 4) + '...' : 'null'}`);
    const socketUrl = `${STT_WEBSOCKET_URL}?model_id=${STT_MODEL}&sample_rate=${AUDIO_SAMPLE_RATE}`;

    // --> Revert to Standard Constructor <--
    let sttSocket: WebSocket;
    try {
      sttSocket = new WebSocket(socketUrl);
      sttSocketRef.current = sttSocket;
    } catch (error) {
        console.error("Failed to create STT WebSocket:", error);
        setCurrentState('error');
        onError?.('Failed to initialize STT connection.');
        stopSession(); // Cleanup
        return; // Stop further execution
    }

    sttSocket.onopen = async () => {
      console.log('STT WebSocket opened.');
      // --> Send initial empty/space text only (No Key) <--
      // Based on TTS example, trying same for STT
      sttSocket.send(JSON.stringify({ 
          // xi_api_key: apiKey, // Removed key based on web example
          text: " " 
      })); 

      // Setup MediaRecorder
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true 
        } });
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: AUDIO_BIT_RATE
        });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0 && sttSocketRef.current?.readyState === WebSocket.OPEN) {
            sttSocketRef.current.send(event.data);
          }
        };

        mediaRecorderRef.current.onstart = () => {
          console.log('MediaRecorder started.');
          setCurrentState('listening');
        };

        mediaRecorderRef.current.onstop = () => {
          console.log('MediaRecorder stopped.');
          // Only send EOS if socket is still open and we weren't stopped by an error
          if (sttSocketRef.current?.readyState === WebSocket.OPEN && currentState !== 'error') {
             try { sttSocketRef.current.send(JSON.stringify({})); } // Send EOS
             catch(e) { console.warn("Could not send STT EOS on recorder stop.", e); }
          }
          // Only transition to processing if not already in error or idle
          setCurrentState(prev => (prev !== 'error' && prev !== 'idle' ? 'processing' : prev));
        };

        mediaRecorderRef.current.onerror = (event: Event) => {
            console.error('MediaRecorder error:', (event as any).error || event);
            setCurrentState('error');
            onError?.('Microphone recording error.');
            stopSession(); // Use the unified cleanup
        };

        // Start recording (send data every 500ms)
        mediaRecorderRef.current.start(500);

      } catch (err: any) {
        console.error("Error accessing microphone:", err);
        setCurrentState('error');
        onError?.(`Microphone access failed: ${err.message}`);
        stopSession(); // Use the unified cleanup
      }
    };

    sttSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.is_final) {
          const finalTranscript = data.alternatives?.[0]?.transcript || '';
          console.log("STT Final Transcript:", finalTranscript);
          setUserTranscript(''); // Clear interim
          if (finalTranscript.trim()) {
             onTranscriptReceived(finalTranscript, true);
          }
          // Stay listening if user just finished speaking and bot hasn't responded
          setCurrentState(prev => (prev === 'speaking' ? 'speaking' : 'listening'));
        } else if (data.alternatives?.[0]?.transcript) {
          const interimTranscript = data.alternatives[0].transcript;
          setUserTranscript(interimTranscript);
           // Don't change state based on interim
        }
      } catch (err) {
        console.error('Error parsing STT message:', err, "Data:", event.data);
      }
    };

    sttSocket.onerror = (event) => {
      console.error('STT WebSocket error:', event);
      setCurrentState('error');
      onError?.('Speech-to-text connection error.');
      stopSession(); // Use the unified cleanup
    };

    sttSocket.onclose = (event) => {
      console.log('STT WebSocket closed:', event.code, event.reason);
      // Don't automatically set error on close, stopSession handles state
      sttSocketRef.current = null;
       // Attempt to cleanup if closed unexpectedly
      if (currentState !== 'idle' && !cleanupCalledRef.current) {
         console.warn("STT WebSocket closed unexpectedly. Cleaning up.");
         stopSession();
      }
    };
  }, [apiKey, voiceId, onError, onTranscriptReceived, stopSession, currentState]);

  // --- WebSocket Setup (TTS) ---
  const setupTtsWebSocket = useCallback(() => {
    if (!apiKey || !voiceId || ttsSocketRef.current) return;

    console.log("Setting up TTS WebSocket...");
    console.log(`[Debug] Attempting TTS connection (Key in BOS only): ${apiKey ? apiKey.substring(0, 4) + '...' : 'null'}`);
    // --> Revert to default MP3 output format <--
    const ttsUrl = `${TTS_WEBSOCKET_URL}/${voiceId}/stream-input?model_id=eleven_turbo_v2&output_format=mp3_44100_128`;
    
    let ttsSocket: WebSocket;
    try {
        ttsSocket = new WebSocket(ttsUrl);
        ttsSocketRef.current = ttsSocket;
    } catch (error) {
        console.error("Failed to create TTS WebSocket:", error);
        setCurrentState('error');
        onError?.('Failed to initialize TTS connection.');
        stopSession(); // Cleanup
        return; // Stop further execution
    }

    ttsSocket.onopen = () => {
      console.log('TTS WebSocket opened.');
      // --> Send initial config matching web example (No Key) <--
      ttsSocket.send(JSON.stringify({
        // xi_api_key: apiKey, // Removed key based on web example
        text: " ", // Initial space text
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        // generation_config based on Python/TS examples in docs
        generation_config: { chunk_length_schedule: [120, 160, 250, 290] }
      }));

      // Process any buffered text
      if (textToSendBuffer.current.length > 0) {
        console.log("Sending buffered text to TTS...");
        textToSendBuffer.current.forEach(text => sendTextToTtsSocket(text));
        textToSendBuffer.current = [];
      }
    };

    ttsSocket.onmessage = (event) => {
        if (typeof event.data === 'string') {
            try {
                const data = JSON.parse(event.data);
                 if (data.error) {
                    console.error("TTS Error Message:", data.error);
                    setCurrentState('error');
                    onError?.(`Text-to-speech error: ${data.error}`);
                    stopSession(); // Cleanup on TTS error
                 } else if (data.isFinal || data.alignment) {
                    // TTS stream for a particular text input finished or alignment info
                    console.log("TTS segment finished or info received.");
                    // No state change needed here, playback handles it
                 } else {
                     // console.log("TTS Status:", data); // Other messages
                 }
            } catch (e) {
                console.warn("Failed to parse TTS JSON message, might be status info:", event.data, e);
            }
        } else if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
            const audioDataPromise = (event.data instanceof Blob)
                ? event.data.arrayBuffer()
                : Promise.resolve(event.data);

            audioDataPromise.then(audioData => {
                if (audioData.byteLength > 0) {
                    audioQueueRef.current.push(audioData);
                    if (!isPlayingRef.current) {
                        playNextChunk();
                    }
                }
            }).catch(err => {
                console.error("Error processing TTS audio data:", err);
            });
        }
    };

    ttsSocket.onerror = (event) => {
      console.error('TTS WebSocket error:', event);
      setCurrentState('error');
      onError?.('Text-to-speech connection error.');
      stopSession(); // Use the unified cleanup
    };

    ttsSocket.onclose = (event) => {
      console.log('TTS WebSocket closed:', event.code, event.reason);
      ttsSocketRef.current = null;
       // Attempt to cleanup if closed unexpectedly
       if (currentState !== 'idle' && !cleanupCalledRef.current) {
        console.warn("TTS WebSocket closed unexpectedly. Cleaning up.");
        stopSession();
     }
    };

  }, [apiKey, voiceId, onError, playNextChunk, stopSession, currentState]);

  // Helper to send text chunks to the TTS socket
  const sendTextToTtsSocket = useCallback((text: string) => {
     if (ttsSocketRef.current?.readyState === WebSocket.OPEN) {
        console.log("Sending text to TTS:", text.substring(0, 50) + "...");
        ttsSocketRef.current.send(JSON.stringify({
            text: text + " ", // Add trailing space per ElevenLabs recommendation
        }));
        console.log("Sending EOS signal to TTS for current text.");
        ttsSocketRef.current.send(JSON.stringify({ text: "" }));
     } else {
        console.warn("TTS WebSocket not ready, buffering text.");
        textToSendBuffer.current.push(text);
        if (!ttsSocketRef.current || ttsSocketRef.current.readyState === WebSocket.CLOSED) {
            setupTtsWebSocket();
        }
     }
  }, [setupTtsWebSocket]);

  // --- Public Methods ---
  const startSession = useCallback(() => {
    if (currentState !== 'idle' && currentState !== 'error') {
      console.warn('Session already active or in an unexpected state:', currentState);
      return;
    }
    if (!apiKey) {
        console.error("Cannot start session, API key not available.");
        setCurrentState('error');
        onError?.("API key not loaded. Cannot start session.");
        return;
    }
    console.log("Starting ElevenLabs session...");
    cleanupCalledRef.current = false; // Reset cleanup flag
    setCurrentState('connecting');

    // Initialize AudioContext
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        try {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
             console.log("AudioContext created/recreated.", { state: audioContextRef.current.state });
        } catch (e) {
            console.error("Failed to create AudioContext:", e);
            setCurrentState('error');
            onError?.("Browser does not support required audio features.");
            return;
        }
    }
    // Resume context if needed (e.g., after user interaction)
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
            console.log("AudioContext resumed.");
            // Now setup WebSockets after context is running
            setupSttWebSocket();
            setupTtsWebSocket();
        }).catch(e => {
            console.error("Failed to resume AudioContext:", e);
            setCurrentState('error');
            onError?.("Could not start audio playback. Please interact with the page first.");
            stopSession(); // Cleanup if context fails
        });
    } else {
        // Context already running, setup WebSockets directly
        setupSttWebSocket();
        setupTtsWebSocket();
    }
  }, [currentState, apiKey, setupSttWebSocket, setupTtsWebSocket, onError, stopSession]);

  // Public method to send text for synthesis
  const sendTextToSpeak = useCallback((text: string) => {
    if (currentState === 'idle' || currentState === 'error' || cleanupCalledRef.current) {
      console.warn('Cannot send text to speak, session not active or stopping.', { currentState });
      return;
    }
    if (!text || text.trim().length === 0) {
        return; // Don't send empty text
    }

    // Ensure audio context is running before trying to queue playback
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
            console.log("AudioContext resumed for TTS.")
            sendTextToTtsSocket(text);
        }).catch(e => {
             console.error("Failed to resume AudioContext for TTS:", e);
             setCurrentState('error');
             onError?.("Could not play audio. Please interact with the page first.");
             stopSession(); // Cleanup if context fails
        });
    } else if (audioContextRef.current?.state === 'running') {
        sendTextToTtsSocket(text);
    } else {
         console.error("Cannot send text to speak, AudioContext not running.", { state: audioContextRef.current?.state });
         setCurrentState('error');
         onError?.("Audio system not ready.");
         stopSession(); // Cleanup if context fails
    }

  }, [currentState, sendTextToTtsSocket, onError, stopSession]); // Added onError, stopSession

  // --- Cleanup on Unmount ---
  useEffect(() => {
    return () => {
      console.log("useElevenlabsRealtime unmounting. Cleaning up.");
      stopSession();
      // Ensure AudioContext is closed on final unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext on unmount:", e));
        audioContextRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSession]); // stopSession has its own dependencies, so this should be stable

  // Re-attach error/close handlers if stopSession changes (shouldn't often, but safer)
  // This replaces the final useEffect in the previous version
  useEffect(() => {
    const sttSocket = sttSocketRef.current;
    const ttsSocket = ttsSocketRef.current;

    if (sttSocket) {
      const sttErrorHandler = (event: Event) => {
        console.error('STT WebSocket error (re-attached):', event);
        setCurrentState('error');
        onError?.('Speech-to-text connection error.');
        stopSession();
      };
      const sttCloseHandler = (event: CloseEvent) => {
        console.log('STT WebSocket closed (re-attached):', event.code, event.reason);
        sttSocketRef.current = null;
        if (currentState !== 'idle' && !cleanupCalledRef.current) {
          console.warn("STT WebSocket closed unexpectedly (re-attached). Cleaning up.");
          stopSession();
        }
      };
      sttSocket.onerror = sttErrorHandler;
      sttSocket.onclose = sttCloseHandler;
    }

    if (ttsSocket) {
      const ttsErrorHandler = (event: Event) => {
        console.error('TTS WebSocket error (re-attached):', event);
        setCurrentState('error');
        onError?.('Text-to-speech connection error.');
        stopSession();
      };
      const ttsCloseHandler = (event: CloseEvent) => {
        console.log('TTS WebSocket closed (re-attached):', event.code, event.reason);
        ttsSocketRef.current = null;
        if (currentState !== 'idle' && !cleanupCalledRef.current) {
          console.warn("TTS WebSocket closed unexpectedly (re-attached). Cleaning up.");
          stopSession();
        }
      };
      ttsSocket.onerror = ttsErrorHandler;
      ttsSocket.onclose = ttsCloseHandler;
    }

  }, [stopSession, onError, currentState]); // Depend on stopSession, onError, currentState

  return {
    currentState,
    isApiKeyLoading,
    startSession,
    stopSession,
    sendTextToSpeak,
    userTranscript,
  };
}; 