import { useState, useEffect, useRef, useCallback } from 'react';

interface UseElevenlabsSpeechProps {
  voiceId: string;
  welcomeMessage?: string;
  welcomeMessageStatusRef: React.MutableRefObject<'pending' | 'playing' | 'completed'>;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: string) => void;
  ttsEndpoint?: string;
  apiKey?: string;
}

export function useElevenlabsSpeech({
  voiceId,
  welcomeMessage,
  welcomeMessageStatusRef,
  onSpeechStart,
  onSpeechEnd,
  onError,
  ttsEndpoint,
  apiKey: propApiKey
}: UseElevenlabsSpeechProps) {
  const [isWelcomeMessagePlaying, setIsWelcomeMessagePlaying] = useState(false);
  
  // Refs for WebSocket and audio playback
  const ttsSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const cleanupCalledRef = useRef<boolean>(false);
  
  // Constants
  const RETURN_TO_WAIT_DELAY = 500;
  
  // Audio playback function
  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      if (isPlayingRef.current) {
        isPlayingRef.current = false;
        
        // Signal that speech has ended
        if (welcomeMessageStatusRef.current === 'playing') {
          welcomeMessageStatusRef.current = 'completed';
          setIsWelcomeMessagePlaying(false);
        }
        
        // Trigger the speech end callback after a short delay
        setTimeout(() => {
          onSpeechEnd?.();
        }, RETURN_TO_WAIT_DELAY);
      }
      return;
    }
    
    if (isPlayingRef.current) {
      return; // Already playing
    }
    
    // Start playing
    isPlayingRef.current = true;
    onSpeechStart?.();
    
    // Initialize audio context if needed
    if (!audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        // Resume the audio context on user interaction if suspended
        if (audioContextRef.current.state === 'suspended') {
          // Try to resume on this call
          audioContextRef.current.resume().catch(e => {
            console.warn("Failed to resume AudioContext immediately:", e);
            // Audio context may need user interaction to resume
            const resumeAudio = () => {
              if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().catch(console.error);
              }
              // Once we try to resume, remove the listeners
              document.removeEventListener('click', resumeAudio);
              document.removeEventListener('touchstart', resumeAudio);
              document.removeEventListener('keydown', resumeAudio);
            };
            
            // Add event listeners for common user interactions
            document.addEventListener('click', resumeAudio, { once: true });
            document.addEventListener('touchstart', resumeAudio, { once: true });
            document.addEventListener('keydown', resumeAudio, { once: true });
          });
        }
      } catch (e) {
        console.error("Error creating AudioContext:", e);
        onError?.("Browser does not support required audio features.");
        return;
      }
    }
    
    // Get the next audio chunk
    const audioBuffer = audioQueueRef.current.shift();
    if (!audioBuffer) {
      isPlayingRef.current = false;
      return;
    }
    
    // Create and play audio buffer
    try {
      audioContextRef.current.decodeAudioData(
        audioBuffer,
        (buffer) => {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current!.destination);
          sourceNodeRef.current = source;
          
          source.onended = () => {
            sourceNodeRef.current = null;
            playNextChunk(); // Play next chunk when this one finishes
          };
          
          source.start(0);
        },
        (err) => {
          console.error("Error decoding audio data:", err);
          isPlayingRef.current = false;
          playNextChunk(); // Try next chunk
        }
      );
    } catch (e) {
      console.error("Error playing audio:", e);
      isPlayingRef.current = false;
      playNextChunk(); // Try next chunk
    }
  }, [onSpeechStart, onSpeechEnd, onError, welcomeMessageStatusRef]);
  
  // Send text to TTS WebSocket
  const sendTextToTts = useCallback((text: string) => {
    if (!text || !text.trim()) {
      console.warn("Empty text provided to sendTextToTts, ignoring");
      return;
    }
    
    if (!ttsSocketRef.current || ttsSocketRef.current.readyState !== WebSocket.OPEN) {
      console.error("TTS WebSocket not open, cannot send text");
      onError?.("Voice service not ready. Please try again.");
      return;
    }
    
    try {
      console.log(`Sending text to TTS: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
      
      // Prepare the message object
      const message: any = {
        text: text.trim(),
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          speed: 1.0
        },
        try_trigger_generation: true
      };
      
      // Include API key in every message as a fallback authentication method
      if (propApiKey) {
        message.xi_api_key = propApiKey;
      }
      
      // Send the message
      ttsSocketRef.current.send(JSON.stringify(message));
    } catch (e) {
      console.error("Error sending text to TTS:", e);
      onError?.("Failed to send text to voice service");
    }
  }, [onError, propApiKey]);

  // Use a wrapper for better naming clarity in this component
  const sendTextToSpeak = useCallback((text: string) => {
    sendTextToTts(text);
  }, [sendTextToTts]);
  
  // Memoized function to set up the TTS WebSocket connection
  const setupTtsWebSocket = useCallback(() => {
    if (ttsSocketRef.current?.readyState === WebSocket.OPEN) {
      console.log("%%%% setupTtsWebSocket: WebSocket already open, skipping setup %%%%");
      return;
    }
    
    // Close any existing socket first
    if (ttsSocketRef.current) {
      console.log("%%%% setupTtsWebSocket: Closing existing socket before creating new one %%%%");
      ttsSocketRef.current.close();
      ttsSocketRef.current = null;
    }
    
    // Determine the current API key and voice ID to use
    let currentApiKey = propApiKey;
    const currentVoiceId = voiceId;
    
    // Try to extract API key from the ttsEndpoint URL if apiKey is not provided
    if (!currentApiKey && ttsEndpoint) {
      try {
        const url = new URL(ttsEndpoint);
        // Check for xi_api_key parameter
        currentApiKey = url.searchParams.get('xi_api_key') || 
                        url.searchParams.get('api_key');
        
        if (currentApiKey) {
          console.log("%%%% setupTtsWebSocket: Extracted API key from ttsEndpoint URL %%%%");
        }
      } catch (error) {
        console.error("%%%% setupTtsWebSocket: Error parsing ttsEndpoint URL %%%%", error);
      }
    }
    
    // Check if we have what we need to set up the WebSocket
    console.log(`%%%% setupTtsWebSocket: Checking - API Key Present: ${Boolean(currentApiKey)}, Voice ID: ${currentVoiceId} %%%%`);
    
    if (!currentApiKey || !currentVoiceId) {
      console.log(`%%%% FAILING CHECK! API Key (${typeof currentApiKey}): ${currentApiKey ? 'Present' : 'Missing/Falsy'}, Voice ID (${typeof currentVoiceId}): ${currentVoiceId}`);
      console.log("%%%% setupTtsWebSocket: Missing API Key or Voice ID %%%%");
      onError?.("API key or voice ID not available");
      return;
    }
    
    console.log("%%%% setupTtsWebSocket: Ready to create new WebSocket instance %%%%");
    
    try {
      // If ttsEndpoint is provided, use it directly
      // Otherwise, construct URL with extracted API key
      let ttsUrl = ttsEndpoint;
      
      if (!ttsUrl && currentApiKey && currentVoiceId) {
        // Ensure the API key is properly URI encoded in the URL
        const encodedApiKey = encodeURIComponent(currentApiKey);
        ttsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${currentVoiceId}/stream-input?model_id=eleven_turbo_v2&output_format=mp3_44100_128&xi_api_key=${encodedApiKey}`;
        console.log(`%%%% setupTtsWebSocket: Constructed new URL with API key %%%%`);
      } else if (ttsUrl && currentApiKey) {
        // If we have an endpoint URL but it doesn't have the API key or it's not in the right format
        try {
          const urlObj = new URL(ttsUrl);
          
          // Check if URL already has the API key in any form
          if (!urlObj.searchParams.has('xi_api_key')) {
            // If no xi_api_key, check for api_key
            if (urlObj.searchParams.has('api_key')) {
              // Replace api_key with xi_api_key
              const apiKeyValue = urlObj.searchParams.get('api_key');
              urlObj.searchParams.delete('api_key');
              urlObj.searchParams.set('xi_api_key', apiKeyValue!);
              console.log(`%%%% setupTtsWebSocket: Changed api_key parameter to xi_api_key %%%%`);
            } else {
              // No API key in URL at all, add it
              urlObj.searchParams.set('xi_api_key', currentApiKey);
              console.log(`%%%% setupTtsWebSocket: Added missing xi_api_key to URL %%%%`);
            }
            
            // Update the URL
            ttsUrl = urlObj.toString();
          }
          
          // Check and update output_format if needed
          if (!urlObj.searchParams.has('output_format')) {
            urlObj.searchParams.set('output_format', 'mp3_44100_128');
            ttsUrl = urlObj.toString();
          }
          
          // Check and update model_id if needed
          if (!urlObj.searchParams.has('model_id')) {
            urlObj.searchParams.set('model_id', 'eleven_turbo_v2');
            ttsUrl = urlObj.toString();
          }
          
          // Log the updated URL (with masked API key)
          const maskedUrl = ttsUrl.replace(/xi_api_key=([^&]*)/, 'xi_api_key=***');
          console.log(`%%%% setupTtsWebSocket: Final URL after adjustments: ${maskedUrl} %%%%`);
          
        } catch (error) {
          console.error("%%%% setupTtsWebSocket: Error modifying ttsEndpoint URL %%%%", error);
        }
      }
      
      if (!ttsUrl) {
        throw new Error("Unable to determine TTS WebSocket URL");
      }
      
      // Log the URL (masking the API key)
      console.log(`%%%% setupTtsWebSocket: Using URL: ${ttsUrl.replace(/xi_api_key=([^&]*)/, 'xi_api_key=***').replace(/api_key=([^&]*)/, 'api_key=***')} %%%%`);
      
      // Create the WebSocket
      console.log("%%%% setupTtsWebSocket: Attempting: new WebSocket(ttsUrl) %%%%");
      
      // Create WebSocket with proper headers for API key
      let ttsSocket: WebSocket;
      try {
        if ('WebSocket' in window) {
          // Use the standardized WebSocket constructor
          ttsSocket = new WebSocket(ttsUrl);
          
          // WebSocket doesn't support custom headers, so we'll include the API key
          // in the first message sent after connection
          console.log("%%%% setupTtsWebSocket: Standard WebSocket created %%%%");
        } else {
          // Fallback for older browsers (unlikely to be needed)
          ttsSocket = new WebSocket(ttsUrl);
          console.log("%%%% setupTtsWebSocket: Fallback WebSocket created %%%%");
        }
      } catch (socketError) {
        console.error("%%%% setupTtsWebSocket: Error creating WebSocket instance %%%%", socketError);
        throw socketError;
      }
      
      console.log("%%%% setupTtsWebSocket: WebSocket object created, assigning ref... %%%%");
      ttsSocketRef.current = ttsSocket;
      audioQueueRef.current = [];
      
      // Function to send initial configuration to the TTS WebSocket
      const sendInitialConfiguration = (socket: WebSocket) => {
        // Prepare the initial message object with the required fields
        const initialMessage: any = {
          text: " ", // Initial space as required by API
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            speed: 1.0
          }
        };
        
        // Always include xi_api_key in first message as a fallback authentication method
        // This ensures authentication even if the URL parameter didn't work
        if (currentApiKey) {
          initialMessage.xi_api_key = currentApiKey;
          console.log("%%%% TTS WebSocket: Including API key in initial message as fallback %%%%");
        }
        
        // Send the initial configuration
        socket.send(JSON.stringify(initialMessage));
        
        console.log("%%%% TTS WebSocket: Sent initial configuration %%%%");
        
        // If we have a welcome message and are just connecting, queue it up
        if (welcomeMessage && welcomeMessageStatusRef.current === 'pending') {
          console.log(`%%%% TTS WebSocket: Queuing welcome message: ${welcomeMessage.substring(0, 20)}... %%%%`);
          welcomeMessageStatusRef.current = 'playing';
          setIsWelcomeMessagePlaying(true);
          
          // Use a short timeout to ensure the connection is fully established
          setTimeout(() => {
            if (ttsSocketRef.current?.readyState === WebSocket.OPEN) {
              sendTextToTts(welcomeMessage);
            } else {
              console.warn("%%%% TTS WebSocket: Not ready for welcome message - will retry on reconnect %%%%");
              welcomeMessageStatusRef.current = 'pending';
              setIsWelcomeMessagePlaying(false);
            }
          }, 500);
        }
      };
      
      console.log("%%%% setupTtsWebSocket: Setting up event handlers... %%%%");
      // Set up event handlers
      ttsSocket.onopen = () => {
        console.log("%%%% TTS WebSocket: Connection opened %%%%");
        
        ttsSocketRef.current = ttsSocket;
        
        try {
          // Send the initial configuration
          if (ttsSocket.readyState === WebSocket.OPEN) {
            sendInitialConfiguration(ttsSocket);
          } else {
            console.error("%%%% TTS WebSocket: Cannot send initial config - socket not open %%%%");
          }
        } catch (configError) {
          console.error("%%%% TTS WebSocket: Error sending initial configuration %%%%", configError);
          // Close socket on configuration error
          ttsSocket.close();
          ttsSocketRef.current = null;
          onError?.("Failed to send initial configuration to ElevenLabs");
        }
      };
      
      ttsSocket.onerror = (event) => {
        console.error("%%%% TTS WebSocket: Error event %%%%", event);
        // Clean up the socket reference
        ttsSocketRef.current = null;
        onError?.("ElevenLabs WebSocket error");
      };
      
      ttsSocket.onmessage = (event) => {
        if (cleanupCalledRef.current) {
          console.log("WebSocket message received after cleanup called - ignoring");
          return;
        }
        
        try {
          // Handle JSON messages (metadata)
          if (typeof event.data === 'string') {
            console.log("TTS WebSocket message (text):", event.data);
            const jsonData = JSON.parse(event.data);
            
            // Check if this is an extended silence (end of speech)
            if (jsonData.isFinal === true || jsonData.normalizedAlignment?.length === 0) {
              console.log("TTS final message received, speech generation completed");
              
              // Ensure all audio gets played
              isPlayingRef.current = false;
              playNextChunk();
            }
            return;
          }
          
          // Handle binary data (audio)
          if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            // Convert Blob to ArrayBuffer if needed
            const processAudioData = async (data: ArrayBuffer) => {
              // Queue the audio data
              audioQueueRef.current.push(data);
              
              // Start playing if not already playing
              if (!isPlayingRef.current) {
                playNextChunk();
              }
            };
            
            if (event.data instanceof Blob) {
              // Convert Blob to ArrayBuffer
              event.data.arrayBuffer().then(processAudioData).catch(error => {
                console.error("Error converting Blob to ArrayBuffer:", error);
              });
            } else {
              // Already an ArrayBuffer
              processAudioData(event.data);
            }
            return;
          }
          
          console.warn("Unknown WebSocket message format:", typeof event.data);
        } catch (e) {
          console.error("Error processing TTS WebSocket message:", e);
        }
      };
      
      ttsSocket.onclose = (event) => {
        console.log(`%%%% TTS WebSocket: Connection closed with code ${event.code} %%%%`);
        
        // If this was an authentication error, log it clearly
        if (event.code === 1008) {
          console.error(`%%%% TTS WebSocket: Authentication failed. Code: ${event.code}, Reason: ${event.reason} %%%%`);
          onError?.("ElevenLabs authentication failed. Please check your API key.");
          
          // Make sure speech end is triggered to allow state transition
          if (isPlayingRef.current || welcomeMessageStatusRef.current === 'playing') {
            console.log("%%%% TTS WebSocket: Forcing speech end callback due to authentication error %%%%");
            isPlayingRef.current = false;
            
            if (welcomeMessageStatusRef.current === 'playing') {
              welcomeMessageStatusRef.current = 'completed';
              setIsWelcomeMessagePlaying(false);
            }
            
            setTimeout(() => {
              onSpeechEnd?.();
            }, RETURN_TO_WAIT_DELAY);
          }
        }
        
        // Clean up the socket reference
        ttsSocketRef.current = null;
      };
      
      console.log("%%%% setupTtsWebSocket: Returning promise... %%%%");
      // Return a promise that resolves when the connection is established
      return new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (ttsSocketRef.current?.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        // Set a timeout to resolve anyway after 3 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 3000);
      });
      
    } catch (e) {
      console.error("%%%% setupTtsWebSocket: CRITICAL ERROR in try block %%%%", e);
      onError?.("Failed to set up voice connection.");
      throw e;
    }
  }, [
    propApiKey,
    voiceId, 
    welcomeMessage, 
    onSpeechEnd, 
    onError, 
    playNextChunk, 
    welcomeMessageStatusRef,
    ttsEndpoint
  ]);
  
  // Function to send keep-alive ping to prevent timeout
  const sendKeepAlivePing = useCallback(() => {
    if (!ttsSocketRef.current || ttsSocketRef.current.readyState !== WebSocket.OPEN) return;
    
    try {
      console.log("Sending keep-alive ping");
      
      // Prepare ping message with the same structure as other messages
      const pingMessage: any = {
        text: " ", // Space character for ping
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          speed: 1.0
        }
      };
      
      // Include API key in ping for authentication consistency
      if (propApiKey) {
        pingMessage.xi_api_key = propApiKey;
      }
      
      // Send properly formatted ping message
      ttsSocketRef.current.send(JSON.stringify(pingMessage));
    } catch (err) {
      console.warn("Error sending keep-alive ping:", err);
      
      // If ping fails, reconnect the WebSocket
      setupTtsWebSocket().catch(e => {
        console.error("Failed to reconnect after ping failure:", e);
      });
    }
  }, [setupTtsWebSocket, propApiKey]);
  
  // Set up periodic keep-alive pings
  useEffect(() => {
    if (!propApiKey) return;
    
    const pingInterval = setInterval(() => {
      if (ttsSocketRef.current?.readyState === WebSocket.OPEN) {
        sendKeepAlivePing();
      }
    }, 10000); // Every 10 seconds (ElevenLabs timeout is 20 seconds)
    
    return () => {
      clearInterval(pingInterval);
    };
  }, [propApiKey, sendKeepAlivePing]);
  
  // Stop TTS and close connections
  const stopTts = useCallback(() => {
    cleanupCalledRef.current = true;
    
    // Stop any currently playing audio
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        console.warn("Error stopping audio source:", e);
      }
      sourceNodeRef.current = null;
    }
    
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // Close WebSocket if open
    if (ttsSocketRef.current) {
      try {
        // Only try to close if it's not already closed/closing
        if (ttsSocketRef.current.readyState === WebSocket.OPEN || 
            ttsSocketRef.current.readyState === WebSocket.CONNECTING) {
          console.log("Closing TTS WebSocket connection");
          ttsSocketRef.current.close();
        }
      } catch (e) {
        console.warn("Error closing TTS WebSocket:", e);
      }
      // Always null the reference
      ttsSocketRef.current = null;
    }
    
    // Clean up audio context
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(e => {
            console.warn("Error closing audio context:", e);
          });
        }
      } catch (e) {
        console.warn("Error closing audio context:", e);
      }
      audioContextRef.current = null;
    }
    
    // Reset welcome message status
    welcomeMessageStatusRef.current = 'pending';
    setIsWelcomeMessagePlaying(false);
    
    // Reset cleanup flag (allow future initialization)
    cleanupCalledRef.current = false;
  }, []);
  
  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      stopTts();
    };
  }, [stopTts]);
  
  return {
    sendTextToSpeak,
    setupTtsWebSocket,
    isWelcomeMessagePlaying,
    stopTts
  };
} 