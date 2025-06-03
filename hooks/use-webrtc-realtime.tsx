import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createWebRTCRealtimeSession } from '@/lib/realtime-api/webrtc-session-manager';
import type { 
  WebRTCSessionManager, 
  RealtimeConnectionState, 
  RealtimeSessionState,
  RealtimeEvent 
} from '@/lib/realtime-api/webrtc-session-manager';

export interface WebRTCRealtimeProps {
  chatbotId?: string;
  welcomeMessage?: string;
  onTranscriptReceived?: (text: string, isFinal: boolean) => void;
  onSpeechComplete?: () => void;
  onError?: (message: string) => void;
  debug?: boolean;
  preConnect?: boolean;
}

export interface WebRTCRealtimeReturn {
  // State
  isCallActive: boolean;
  connectionState: RealtimeConnectionState;
  sessionState: RealtimeSessionState;
  statusText: string;
  userTranscript: string;
  assistantTranscript: string;
  
  // Controls
  toggleCall: () => void;
  sendText: (text: string) => void;
  
  // Orb states for compatibility
  orbIsListening: boolean;
  orbIsUserSpeaking: boolean;
  orbIsProcessing: boolean;
  orbIsConnecting: boolean;
  orbIsSpeaking: boolean;
  orbAudioLevel: number;
}

export const useWebRTCRealtime = ({
  chatbotId,
  welcomeMessage = "Hello! How can I help you today?",
  onTranscriptReceived,
  onSpeechComplete,
  onError,
  debug = false,
  preConnect = false
}: WebRTCRealtimeProps): WebRTCRealtimeReturn => {
  
  // Logging
  const log = useCallback((...args: any[]) => {
    if (debug) console.log("[WebRTC Realtime]", ...args);
  }, [debug]);
  
  // State
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('disconnected');
  const [sessionState, setSessionState] = useState<RealtimeSessionState>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);
  const [isPreConnected, setIsPreConnected] = useState(false);
  
  // Refs
  const sessionManagerRef = useRef<WebRTCSessionManager | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const assistantItemIdRef = useRef<string | null>(null);
  const sendTextRef = useRef<(text: string) => void>(() => {});
  const sessionInfoRef = useRef<{ 
    voice: string; 
    instructions: string; 
    welcomeMessage: string;
    voiceConfig?: {
      openaiVoice: string;
      description: string;
      language: string;
    };
    calendarConfig?: any;
    calendarTools?: any[];
    chatbotUserId?: string;
  } | null>(null);
  
  // Initialize session
  const initializeSession = useCallback(async () => {
    if (sessionManagerRef.current) {
      log("Session already exists");
      return;
    }
    
    try {
      log("Initializing WebRTC session");
      
      // Create audio element if not exists
      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement('audio');
        audioElementRef.current.autoplay = true;
      }
      
      // Create session manager
      sessionManagerRef.current = createWebRTCRealtimeSession();
      
      // Setup event listeners
      sessionManagerRef.current.onConnectionChange((state) => {
        log("Connection state changed:", state);
        setConnectionState(state);
      });
      
      sessionManagerRef.current.onStateChange((state) => {
        log("Session state changed:", state);
        setSessionState(state);
      });
      
      sessionManagerRef.current.onEvent((event: RealtimeEvent) => {
        handleRealtimeEvent(event);
      });
      
      // Get ephemeral token
      const response = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatbotId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      const sessionData = await response.json();
      log("Received session data:", sessionData);
      
      // Store the session info for later use
      const sessionInfo = {
        voice: sessionData.voice || 'alloy',
        instructions: sessionData.enhanced_instructions || sessionData.instructions || '',
        welcomeMessage: sessionData.chatbot_details?.welcomeMessage || welcomeMessage,
        voiceConfig: sessionData.voice_config,
        calendarConfig: sessionData.calendar_config,
        calendarTools: sessionData.calendar_tools,
        chatbotUserId: sessionData.chatbot_user_id
      };
      
      // Connect via WebRTC
      await sessionManagerRef.current.connect(
        sessionData.client_secret.value,
        audioElementRef.current!
      );
      
      // Store session info in a ref for the event handler
      sessionInfoRef.current = sessionInfo;
      
      log("WebRTC connection established");
      
    } catch (err) {
      console.error("Failed to initialize WebRTC session", err);
      if (onError) onError("Failed to connect");
      throw err;
    }
  }, [chatbotId, log, onError]);
  
  // Handle function calls from the AI
  const handleFunctionCall = useCallback(async (event: RealtimeEvent) => {
    const functionName = event.name;
    const functionArgs = event.arguments ? JSON.parse(event.arguments) : {};
    const callId = event.call_id;
    
    log("Executing function:", functionName, "with args:", functionArgs);
    
    // Get calendar config from session info
    const calendarConfig = sessionInfoRef.current?.calendarConfig;
    const chatbotUserId = sessionInfoRef.current?.chatbotUserId;
    
    let result = null;
    let error = null;
    
    try {
      // Make API call to execute calendar function on the server
      const response = await fetch('/api/calendar-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName,
          args: functionArgs,
          calendarConfig,
          chatbotUserId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Calendar operation failed');
      }
      
      const data = await response.json();
      result = data.result;
      
      log("Function result:", result);
      
      // Send function output as a conversation item
      sessionManagerRef.current?.sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: result
        }
      });
      
      // Continue the response after function execution
      sessionManagerRef.current?.sendEvent({
        type: 'response.create'
      });
      
    } catch (err: any) {
      console.error("Function call error:", err);
      error = err.message || 'Function execution failed';
      
      // Send error as function output
      sessionManagerRef.current?.sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({
            success: false,
            error: error
          })
        }
      });
      
      // Continue response
      sessionManagerRef.current?.sendEvent({
        type: 'response.create'
      });
    }
  }, [log]);
  
  // Handle Realtime API events
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    log("Event:", event.type);
    
    switch (event.type) {
      case 'session.created':
        log("Session created successfully", event.session);
        
        // Configure session with chatbot settings
        const sessionConfig = {
          modalities: ['text', 'audio'],
          voice: sessionInfoRef.current?.voiceConfig?.openaiVoice || sessionInfoRef.current?.voice || event.session?.voice || 'alloy',
          instructions: sessionInfoRef.current?.instructions || event.session?.instructions || '',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: event.session?.tools || []
        };
        
        log("Updating session with config:", {
          voice: sessionConfig.voice,
          instructionsLength: sessionConfig.instructions.length,
          hasTools: sessionConfig.tools.length > 0
        });
        
        sessionManagerRef.current?.updateSession(sessionConfig);
        
        // Use the actual welcome message from chatbot
        const actualWelcomeMessage = sessionInfoRef.current?.welcomeMessage || welcomeMessage;
        
        // Only send welcome message if call is active (not pre-connected)
        if (actualWelcomeMessage && !hasPlayedWelcome && isCallActive) {
          setTimeout(() => {
            log("Sending welcome message:", actualWelcomeMessage);
            sendTextRef.current(actualWelcomeMessage);
            setHasPlayedWelcome(true);
          }, 500);
        }
        
        // Mark as pre-connected if in pre-connect mode
        if (!isCallActive && preConnect) {
          setIsPreConnected(true);
          log("Pre-connection established");
        }
        break;
        
      case 'conversation.item.created':
        const role = event.item?.role;
        if (role === 'assistant') {
          assistantItemIdRef.current = event.item?.id || null;
          setAssistantTranscript('');
        }
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        const transcript = event.transcript || '';
        log("User transcript:", transcript);
        setUserTranscript(transcript);
        if (onTranscriptReceived) {
          onTranscriptReceived(transcript, true);
        }
        break;
        
      case 'response.audio_transcript.delta':
        const delta = event.delta || '';
        setAssistantTranscript(prev => prev + delta);
        break;
        
      case 'response.audio_transcript.done':
        const finalTranscript = event.transcript || assistantTranscript;
        log("Assistant transcript:", finalTranscript);
        break;
        
      case 'response.done':
        log("Response completed");
        if (onSpeechComplete) {
          onSpeechComplete();
        }
        // Clear user transcript for next turn
        setUserTranscript('');
        break;
        
      case 'response.function_call_arguments.done':
        log("Function call arguments completed:", event);
        handleFunctionCall(event);
        break;
        
      case 'error':
        console.error("Realtime API error:", event);
        if (onError) onError(event.error?.message || 'Unknown error');
        break;
    }
  }, [welcomeMessage, hasPlayedWelcome, assistantTranscript, onTranscriptReceived, onSpeechComplete, onError, log, isCallActive, preConnect, handleFunctionCall]);
  
  // Send text message
  const sendText = useCallback((text: string) => {
    if (!sessionManagerRef.current || connectionState !== 'connected') {
      log("Cannot send text - not connected");
      return;
    }
    
    // Check if a response is already active
    if (sessionManagerRef.current.isResponseActive()) {
      log("Cannot send text - response already active");
      return;
    }
    
    // Create conversation item
    sessionManagerRef.current.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text
        }]
      }
    });
    
    // Trigger response
    sessionManagerRef.current.sendEvent({
      type: 'response.create'
    });
  }, [connectionState, log]);
  
  // Update ref whenever sendText changes
  useEffect(() => {
    sendTextRef.current = sendText;
  }, [sendText]);
  
  // Toggle call
  const toggleCall = useCallback(async () => {
    if (isCallActive) {
      log("Ending call");
      setIsCallActive(false);
      
      // If pre-connect is enabled, keep connection alive
      if (preConnect && sessionManagerRef.current) {
        setHasPlayedWelcome(false);
        setUserTranscript('');
        setAssistantTranscript('');
        log("Keeping connection alive (pre-connected)");
      } else {
        sessionManagerRef.current?.cleanup();
        sessionManagerRef.current = null;
        setConnectionState('disconnected');
        setSessionState('idle');
        setUserTranscript('');
        setAssistantTranscript('');
        setHasPlayedWelcome(false);
        setIsPreConnected(false);
      }
    } else {
      log("Starting call");
      setIsCallActive(true);
      
      // If already pre-connected, just send welcome message
      if (isPreConnected && sessionManagerRef.current) {
        log("Using pre-connected session");
        // Send welcome message
        const actualWelcomeMessage = sessionInfoRef.current?.welcomeMessage || welcomeMessage;
        if (actualWelcomeMessage && !hasPlayedWelcome) {
          setTimeout(() => {
            log("Sending welcome message:", actualWelcomeMessage);
            sendTextRef.current(actualWelcomeMessage);
            setHasPlayedWelcome(true);
          }, 100);
        }
      } else {
        // Initialize new session
        try {
          await initializeSession();
        } catch (err) {
          setIsCallActive(false);
          toast.error("Failed to start voice call");
        }
      }
    }
  }, [isCallActive, isPreConnected, hasPlayedWelcome, welcomeMessage, preConnect, log, initializeSession]);
  
  // Pre-connect on mount if enabled
  useEffect(() => {
    if (preConnect && !sessionManagerRef.current && !isCallActive) {
      log("Pre-connecting on mount");
      initializeSession().catch(err => {
        console.error("Pre-connection failed:", err);
      });
    }
  }, [preConnect, isCallActive, initializeSession, log]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionManagerRef.current?.cleanup();
    };
  }, []);
  
  // Generate status text
  const statusText = (() => {
    if (!isCallActive) {
      if (isPreConnected) {
        return "Ready to start - Click to begin";
      } else if (connectionState === 'connecting' && preConnect) {
        return "Preparing voice service...";
      }
      return "Click to start voice call";
    }
    
    switch (connectionState) {
      case 'connecting':
        return "Connecting...";
      case 'error':
        return "Connection error";
      case 'connected':
        switch (sessionState) {
          case 'listening':
            return "Listening...";
          case 'user_speaking':
            return "I hear you...";
          case 'thinking':
            return "Thinking...";
          case 'speaking':
            return "Speaking...";
          default:
            return "Ready";
        }
      default:
        return "Disconnected";
    }
  })();
  
  // Compute orb states
  const orbIsListening = sessionState === 'listening';
  const orbIsUserSpeaking = sessionState === 'user_speaking';
  const orbIsProcessing = sessionState === 'thinking';
  const orbIsConnecting = connectionState === 'connecting';
  const orbIsSpeaking = sessionState === 'speaking';
  const orbAudioLevel = 0; // WebRTC handles audio internally
  
  return {
    // State
    isCallActive,
    connectionState,
    sessionState,
    statusText,
    userTranscript,
    assistantTranscript,
    
    // Controls
    toggleCall,
    sendText,
    
    // Orb states
    orbIsListening,
    orbIsUserSpeaking,
    orbIsProcessing,
    orbIsConnecting,
    orbIsSpeaking,
    orbAudioLevel,
  };
}; 