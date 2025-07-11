'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import RiveVoiceOrb from '@/components/chat-interface/rive-voice-orb';
import { toast } from 'sonner';
import { 
  Room, 
  RoomEvent, 
  RemoteParticipant, 
  LocalParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
  ConnectionState,
  DisconnectReason,
  ParticipantEvent,
  AudioTrack,
  TranscriptionSegment,
} from 'livekit-client';

interface VoiceInterfaceProps {
  chatbotId: string;
  welcomeMessage?: string;
  onTranscriptReceived?: (transcript: string, isFinal: boolean) => void;
  debug?: boolean;
}

interface VoiceState {
  status: 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'connected';
  isConnected: boolean;
  conversationStarted: boolean;
  currentTranscript: string;
  assistantResponse: string;
  audioLevel: number;
  isSpeaking: boolean;
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>;
  isActuallyPlaying: boolean;
  recognition?: any;
  userTranscript?: string;
  error?: string;
  roomName?: string;
}

export function VoiceInterface({ 
  chatbotId, 
  welcomeMessage, 
  onTranscriptReceived,
  debug = false 
}: VoiceInterfaceProps) {
  
  // Performance timing - LiveKit WebRTC optimized!
  const timingsRef = useRef<{
    connectionStartTime?: number;
    firstTranscriptTime?: number;
    llmStartTime?: number;
    llmEndTime?: number;
    ttsStartTime?: number;
    ttsEndTime?: number;
    totalStartTime?: number;
  }>({});

  // Voice state (keeping exact same structure)
  const [voiceState, setVoiceState] = useState<VoiceState>({
    status: 'idle',
    isConnected: false,
    conversationStarted: false,
    currentTranscript: '',
    assistantResponse: '',
    audioLevel: 0,
    isSpeaking: false,
    conversationHistory: [],
    isActuallyPlaying: false
  });

  // LiveKit refs
  const roomRef = useRef<Room | null>(null);
  const audioTrackRef = useRef<AudioTrack | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentTranscriptRef = useRef<string>('');
  const agentParticipantRef = useRef<RemoteParticipant | null>(null);
  const roomNameRef = useRef<string | null>(null); // Store room name synchronously

  // Get LiveKit access token with agent configuration
  const getAccessToken = useCallback(async () => {
    try {
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: `user_${Date.now()}`,
          roomName: `voice_session_${chatbotId}_${Date.now()}`,
          agentId: chatbotId, // Pass the agent ID for the LinkAI bridge
          metadata: {
            // Pass agent configuration to the LiveKit agent
            agentId: chatbotId,
            language: 'en-US', // This should come from agent config
            source: 'web'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[LiveKit] Failed to get access token:', error);
      throw error;
    }
  }, [chatbotId]);

  // Initialize LiveKit room connection
  const initializeLiveKitConnection = useCallback(async () => {
    try {
      console.log('[LiveKit WebRTC] 🚀 Initializing connection...');
      timingsRef.current.connectionStartTime = performance.now();
      
      // Get access token and room info
      const { token, wsUrl, roomName } = await getAccessToken();
      
      // Set room name immediately in both ref (synchronous) and state (async)
      roomNameRef.current = roomName;
      setVoiceState(prev => ({ 
        ...prev, 
        roomName: roomName 
      }));
      
      // Create room
      const room = new Room({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
        },
        adaptiveStream: true,
        dynacast: true,
      });
      
      roomRef.current = room;

      // Set up room event handlers
      room.on(RoomEvent.Connected, () => {
        console.log('[LiveKit WebRTC] ✅ Connected to room');
        const connectionTime = performance.now() - (timingsRef.current.connectionStartTime || 0);
        console.log(`[LiveKit WebRTC] Connection established: ${connectionTime.toFixed(2)}ms`);
        
        setVoiceState(prev => ({ 
          ...prev, 
          isConnected: true, 
          status: 'connected',
          conversationStarted: true,
          roomName: roomName
        }));
      });

      room.on(RoomEvent.Disconnected, (reason: DisconnectReason) => {
        console.log('[LiveKit WebRTC] Disconnected:', reason);
        setVoiceState(prev => ({ 
          ...prev, 
          isConnected: false, 
          status: 'idle',
          conversationStarted: false 
        }));
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('[LiveKit WebRTC] Agent connected:', participant.identity);
        agentParticipantRef.current = participant;

        // Handle agent transcriptions (what the agent says)
        participant.on(ParticipantEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio) {
            console.log('[LiveKit WebRTC] 🎧 Agent audio track subscribed');
            setVoiceState(prev => ({ ...prev, isActuallyPlaying: true }));
            
            // Auto-attach audio element for playback
            const audioElement = track.attach() as HTMLAudioElement;
            audioElement.onended = () => {
              setVoiceState(prev => ({ ...prev, isActuallyPlaying: false }));
            };
            document.body.appendChild(audioElement);
          }
        });

        participant.on(ParticipantEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio) {
            console.log('[LiveKit WebRTC] Agent audio track unsubscribed');
            setVoiceState(prev => ({ ...prev, isActuallyPlaying: false }));
          }
        });
      });

      // Handle transcriptions from LiveKit agent
      room.on(RoomEvent.TranscriptionReceived, (transcriptions: TranscriptionSegment[]) => {
        transcriptions.forEach((segment) => {
          const transcript = segment.text;
          
          // With the new LiveKit agent architecture, all transcriptions come from the agent
          // The agent handles the user speech internally and only sends back responses
          if (segment.final) {
            console.log('[LiveKit WebRTC] 🤖 Agent response:', transcript);
            
            setVoiceState(prev => ({ 
              ...prev, 
              assistantResponse: transcript,
              status: 'speaking'
            }));
            
            // Add to conversation history
            setVoiceState(prev => ({
              ...prev,
              conversationHistory: [...prev.conversationHistory, { role: 'assistant', content: transcript }]
            }));
          }
        });
      });

      // Handle agent audio responses via data messages
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant, kind, topic) => {
        if (topic === 'agent_audio') {
          try {
            const message = JSON.parse(new TextDecoder().decode(payload));
            
            if (message.type === 'agent_audio' && message.audio) {
              console.log('[LiveKit WebRTC] 🔊 Received agent audio response');
              
              // Decode base64 audio and play it
              const audioData = atob(message.audio);
              const audioBytes = new Uint8Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                audioBytes[i] = audioData.charCodeAt(i);
              }
              
              // Create blob and play audio
              const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              
              // Update state during playback
              setVoiceState(prev => ({ ...prev, isActuallyPlaying: true, status: 'speaking' }));
              
              audio.onended = () => {
                setVoiceState(prev => ({ ...prev, isActuallyPlaying: false, status: 'listening' }));
                URL.revokeObjectURL(audioUrl);
              };
              
              audio.onerror = (error) => {
                console.error('[LiveKit WebRTC] Audio playback error:', error);
                setVoiceState(prev => ({ ...prev, isActuallyPlaying: false, status: 'listening' }));
                URL.revokeObjectURL(audioUrl);
              };
              
              // Play the audio
              audio.play().catch(error => {
                console.error('[LiveKit WebRTC] Failed to play audio:', error);
                setVoiceState(prev => ({ ...prev, isActuallyPlaying: false, status: 'listening' }));
              });
            }
          } catch (error) {
            console.error('[LiveKit WebRTC] Error processing agent audio:', error);
          }
        }
      });

      // Handle connection errors
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log('[LiveKit WebRTC] Connection state:', state);
        
        if (state === ConnectionState.Reconnecting) {
          setVoiceState(prev => ({ ...prev, status: 'processing' }));
        } else if (state === ConnectionState.Disconnected) {
          setVoiceState(prev => ({ 
            ...prev, 
            status: 'error',
            isConnected: false,
            conversationStarted: false 
          }));
        }
      });

      // Connect to room
      console.log('[LiveKit WebRTC] Connecting to room:', roomName);
      await room.connect(wsUrl, token);
      
      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log('[LiveKit WebRTC] 🎤 Microphone enabled');
      
      // Set up audio level monitoring
      const audioTrackPub = Array.from(room.localParticipant.audioTrackPublications.values())[0];
      const audioTrack = audioTrackPub?.audioTrack;
      if (audioTrack) {
        audioTrackRef.current = audioTrack;
        setupAudioLevelMonitoring(audioTrack);
      }

      // Start AI agent for this room
      console.log('[LiveKit WebRTC] 🤖 Starting AI agent for room...');
      try {
        const agentResponse = await fetch('https://voice-server.fly.dev/start-web-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: roomName,
            agentConfig: {
              agentId: chatbotId,
              systemPrompt: 'You are a helpful AI voice assistant. Keep responses concise and conversational.',
              language: 'en-US',
              source: 'web'
            }
          })
        });
        
        if (agentResponse.ok) {
          console.log('[LiveKit WebRTC] ✅ AI agent starting...');
        } else {
          console.warn('[LiveKit WebRTC] ⚠️ Failed to start AI agent:', await agentResponse.text());
        }
      } catch (error) {
        console.error('[LiveKit WebRTC] ❌ Error starting AI agent:', error);
      }

      // Auto-play welcome message if provided
      if (welcomeMessage) {
        console.log('[LiveKit WebRTC] Welcome message will be handled by agent');
      }
      
    } catch (error) {
      console.error('[LiveKit WebRTC] ❌ Failed to initialize connection:', error);
      setVoiceState(prev => ({ ...prev, status: 'error' }));
      toast.error('Failed to initialize voice connection');
    }
  }, [getAccessToken, welcomeMessage, onTranscriptReceived]);

  // Set up audio level monitoring for visual feedback
  const setupAudioLevelMonitoring = useCallback((audioTrack: AudioTrack) => {
    try {
      // Get the MediaStreamTrack from LiveKit's AudioTrack
      const mediaStreamTrack = audioTrack.mediaStreamTrack;
      if (!mediaStreamTrack) return;

      // Create audio context for level analysis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      // Create media stream source
      const stream = new MediaStream([mediaStreamTrack]);
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Set up audio level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (Root Mean Square) for audio level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const audioLevel = rms / 255; // Normalize to 0-1
        
        setVoiceState(prev => ({ ...prev, audioLevel }));
        
        // Continue monitoring if still connected
        if (roomRef.current?.state === ConnectionState.Connected) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
      
    } catch (error) {
      console.error('[LiveKit WebRTC] Failed to set up audio level monitoring:', error);
    }
  }, []);

  // Start conversation (connect to LiveKit)
  const startConversation = useCallback(async () => {
    if (voiceState.status === 'idle') {
      console.log('[LiveKit WebRTC] 🚀 Starting conversation');
      timingsRef.current.totalStartTime = performance.now();
      await initializeLiveKitConnection();
      // Start speech recognition for voice input (room name should be set now)
      startSpeechRecognition();
    }
  }, [voiceState.status, initializeLiveKitConnection]);

  // Stop conversation (disconnect from LiveKit)
  const stopConversation = useCallback(async () => {
    console.log('[LiveKit WebRTC] Stopping conversation');
    stopSpeechRecognition();
    cleanup();
    setVoiceState({
      status: 'idle',
      isConnected: false,
      conversationStarted: false,
      currentTranscript: '',
      assistantResponse: '',
      audioLevel: 0,
      isSpeaking: false,
      conversationHistory: [],
      isActuallyPlaying: false
    });
  }, []);

  // Cleanup resources
  const cleanup = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    audioTrackRef.current = null;
    agentParticipantRef.current = null;
    currentTranscriptRef.current = '';
    roomNameRef.current = null;
    
    // Remove any dynamically created audio elements
    document.querySelectorAll('audio[data-livekit]').forEach(el => el.remove());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Get orb states - ensure clear mapping for voice modes (KEEPING EXACT SAME LOGIC)
  const orbStates = {
    isListening: voiceState.conversationStarted && (voiceState.status === 'listening' || voiceState.status === 'connected'),
    isUserSpeaking: voiceState.isSpeaking,
    isThinking: voiceState.status === 'processing',
    isSpeaking: voiceState.isActuallyPlaying,
    isWaiting: false,
    isAsleep: !voiceState.conversationStarted,
    audioLevel: voiceState.audioLevel
  };

  // Function to process transcript with voice agent
  // Track processing state to prevent duplicate requests
  const isProcessingRef = useRef(false);
  const lastTranscriptRef = useRef('');
  
  const processWithVoiceAgent = async (transcript: string) => {
    const clientStart = Date.now();
    try {
      // Prevent duplicate processing
      if (isProcessingRef.current) {
        console.log('[Voice Agent] ⏸️ Already processing, skipping duplicate request');
        return;
      }
      
      // Check if this is the same transcript as last time (debouncing)
      if (lastTranscriptRef.current === transcript) {
        console.log('[Voice Agent] 🔄 Duplicate transcript, skipping');
        return;
      }
      
      isProcessingRef.current = true;
      lastTranscriptRef.current = transcript;
      
      console.log('[Voice Agent] 📤 Sending transcript to voice server:', transcript);
      console.log(`⏱️  [CLIENT TIMING] Starting voice processing at ${new Date().toISOString()}`);
      
      // Get roomName from ref (synchronous, always available)
      const currentRoomName = roomNameRef.current;
      
      if (!currentRoomName) {
        console.error('[Voice Agent] ❌ No room name available - connection may not be established yet');
        setVoiceState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: 'Room not connected yet. Please wait for connection to establish.' 
        }));
        return;
      }
      
      console.log('[Voice Agent] 🏠 Using room name:', currentRoomName);
      setVoiceState(prev => ({ ...prev, status: 'processing' }));
      
      // Always use the deployed voice server URL since it's running on Fly.io
      const voiceServerUrl = 'https://voice-server.fly.dev';
      
      const requestBody = {
        roomName: currentRoomName,
        transcript: transcript,
        userId: `user_${Date.now()}`
      };
      
      console.log('[Voice Agent] 📋 Request body:', requestBody);
      
      const networkStart = Date.now();
      console.log(`⏱️  [CLIENT TIMING] Starting network request to voice server`);
      
      const response = await fetch(`${voiceServerUrl}/process-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Voice server error: ${response.status}`);
      }
      
      const result = await response.json();
      const networkTime = Date.now() - networkStart;
      console.log(`⏱️  [CLIENT TIMING] Network request completed in ${networkTime}ms`);
      
      if (result.success && result.response) {
        console.log('[Voice Agent] 🤖 Received AI response:', result.response);
        
        // Update UI with AI response
        setVoiceState(prev => ({ 
          ...prev, 
          assistantResponse: result.response,
          status: 'speaking'
        }));
        
        // Add to conversation history
        const userMessage = { role: 'user' as const, content: transcript };
        const assistantMessage = { role: 'assistant' as const, content: result.response };
        
        onTranscriptReceived?.(userMessage.content, false);
        onTranscriptReceived?.(assistantMessage.content, true);
        
        // Convert AI response to speech - prefer ElevenLabs audio if available
        const audioStart = Date.now();
        console.log(`⏱️  [CLIENT TIMING] Starting audio playback`);
        
        if (result.audioUrl) {
          console.log('[Voice Agent] 🎵 Playing ElevenLabs audio response from URL');
          await playAudioFromUrl(result.audioUrl);
        } else {
          console.log('[Voice Agent] 🔊 Using browser TTS fallback');
          await speakResponse(result.response);
        }
        
        const audioTime = Date.now() - audioStart;
        const totalClientTime = Date.now() - clientStart;
        console.log(`⏱️  [CLIENT TIMING] Audio playback completed in ${audioTime}ms`);
        console.log(`⏱️  [CLIENT TIMING] Total client processing: ${totalClientTime}ms (Network: ${networkTime}ms, Audio: ${audioTime}ms)`);
        
      } else {
        console.log('[Voice Agent] 🤐 No AI response received');
        setVoiceState(prev => ({ ...prev, status: 'idle' }));
      }
      
    } catch (error) {
      console.error('[Voice Agent] ❌ Error processing with voice agent:', error);
      setVoiceState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: `Voice agent error: ${error.message}` 
      }));
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Function to speak AI response using browser TTS
  const speakResponse = async (text: string) => {
    try {
      console.log('[TTS] 🔊 Speaking AI response:', text);
      
      if ('speechSynthesis' in window) {
        // Stop any current speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Try to use a more natural voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.name.includes('Natural') || 
          voice.name.includes('Neural') ||
          voice.name.includes('Enhanced')
        ) || voices.find(voice => voice.lang.startsWith('en'));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          console.log('[TTS] 🎤 Using voice:', preferredVoice.name);
        }
        
        utterance.onstart = () => {
          console.log('[TTS] 🔊 Started speaking');
          setVoiceState(prev => ({ ...prev, status: 'speaking' }));
        };
        
        utterance.onend = () => {
          console.log('[TTS] ✅ Finished speaking');
          setVoiceState(prev => ({ ...prev, status: 'idle' }));
        };
        
        utterance.onerror = (event) => {
          console.error('[TTS] ❌ Speech synthesis error:', event);
          setVoiceState(prev => ({ ...prev, status: 'idle' }));
        };
        
        window.speechSynthesis.speak(utterance);
        
      } else {
        console.log('[TTS] ❌ Speech synthesis not supported');
        setVoiceState(prev => ({ ...prev, status: 'idle' }));
      }
      
    } catch (error) {
      console.error('[TTS] ❌ Error in text-to-speech:', error);
      setVoiceState(prev => ({ ...prev, status: 'idle' }));
    }
  };

  // Function to play ElevenLabs audio from URL (much faster than base64)
  const playAudioFromUrl = async (audioUrl: string) => {
    try {
      console.log('[TTS] 🎵 Playing ElevenLabs audio from URL:', audioUrl);
      setVoiceState(prev => ({ ...prev, status: 'speaking' }));
      
      // Create audio element directly with URL (streams as it loads)
      const audio = new Audio(audioUrl);
      
      audio.onloadstart = () => {
        console.log('[TTS] 🔊 Started loading ElevenLabs audio');
      };
      
      audio.oncanplay = () => {
        console.log('[TTS] 🎵 ElevenLabs audio ready to play');
      };
      
      audio.onplay = () => {
        console.log('[TTS] 🔊 Started playing ElevenLabs audio');
      };
      
      audio.onended = () => {
        console.log('[TTS] ✅ Finished playing ElevenLabs audio');
        setVoiceState(prev => ({ ...prev, status: 'idle' }));
      };
      
      audio.onerror = (error) => {
        console.error('[TTS] ❌ ElevenLabs audio playback error:', error);
        setVoiceState(prev => ({ ...prev, status: 'idle' }));
      };
      
      // Audio streams directly from URL - much faster than base64 decode
      await audio.play();
      
    } catch (error) {
      console.error('[TTS] ❌ Error playing ElevenLabs audio from URL:', error);
      setVoiceState(prev => ({ ...prev, status: 'idle' }));
    }
  };

  // Start speech recognition
  const startSpeechRecognition = () => {
    const speechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!speechRecognition) {
      console.error('[Voice] ❌ Speech recognition not supported');
      setVoiceState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: 'Speech recognition not supported in this browser' 
      }));
      return;
    }

    const recognition = new speechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      console.log('[Voice] 🎙️ Speech recognition started');
      setVoiceState(prev => ({ ...prev, status: 'listening', recognition }));
    };
    
    recognition.onresult = async (event: any) => {
      const sttStart = Date.now();
      const results = Array.from(event.results);
      let finalTranscript = '';
      let interimTranscript = '';
      
      results.forEach((result: any) => {
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      });
      
      // Update UI with interim results
      if (interimTranscript) {
        setVoiceState(prev => ({ 
          ...prev, 
          userTranscript: interimTranscript,
          currentTranscript: interimTranscript
        }));
      }
      
      // Process final transcript
      if (finalTranscript.trim()) {
        const sttTime = Date.now() - sttStart;
        console.log('[Voice] 📝 Final transcript:', finalTranscript);
        console.log(`⏱️  [CLIENT TIMING] Speech recognition processing: ${sttTime}ms`);
        
        setVoiceState(prev => ({ 
          ...prev, 
          userTranscript: finalTranscript,
          currentTranscript: finalTranscript,
          status: 'processing'
        }));
        
        // Send transcript to voice server for AI processing
        await processWithVoiceAgent(finalTranscript.trim());
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('[Voice] ❌ Speech recognition error:', event.error);
      setVoiceState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: `Speech recognition error: ${event.error}` 
      }));
    };
    
    recognition.onend = () => {
      console.log('[Voice] 🛑 Speech recognition ended');
      if (voiceState.status === 'listening') {
        setVoiceState(prev => ({ ...prev, status: 'idle' }));
      }
    };
    
    recognition.start();
  };

  // Stop speech recognition
  const stopSpeechRecognition = () => {
    if (voiceState.recognition) {
      voiceState.recognition.stop();
      setVoiceState(prev => ({ ...prev, recognition: undefined, status: 'idle' }));
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-background overflow-hidden">
      {/* Status indicator */}
      {voiceState.conversationStarted && (
        <div className="absolute top-4 right-4 z-10">
          <span className={`text-xs px-2 py-1 rounded ${
            voiceState.status === 'error'
              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
          }`}>
            {voiceState.status === 'listening' ? 'Listening...' :
             voiceState.status === 'processing' ? 'Processing...' :
             voiceState.status === 'speaking' ? 'Speaking...' :
             voiceState.status === 'error' ? 'Error' : 'Connected'}
          </span>
        </div>
      )}
      
      {/* Voice orb */}
      <div className="w-48 h-48 flex-shrink-0">
        <RiveVoiceOrb {...orbStates} />
      </div>
      
      {/* Status text */}
      <p className="mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300 text-center">
        {voiceState.status === 'idle' && 'Ready to connect - Click to start'}
        {voiceState.status === 'connected' && !voiceState.conversationStarted && 'Connected - Click to start conversation'}
        {voiceState.status === 'connected' && voiceState.conversationStarted && 'Connected - Speak anytime'}
        {voiceState.status === 'listening' && 'Listening... Speak now'}
        {voiceState.status === 'processing' && 'Processing your request...'}
        {voiceState.status === 'speaking' && 'Speaking...'}
        {voiceState.status === 'error' && 'Error occurred'}
      </p>
      
      {/* Transcripts */}
      {voiceState.conversationStarted && (voiceState.currentTranscript || voiceState.assistantResponse) && (
        <div className="mt-4 w-full max-w-md space-y-2 max-h-48 overflow-y-auto">
          {voiceState.currentTranscript && (
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-3 text-sm">
              <span className="font-medium text-neutral-600 dark:text-neutral-400">You: </span>
              {voiceState.currentTranscript}
            </div>
          )}
          {voiceState.assistantResponse && (
            <div className="bg-neutral-50 dark:bg-neutral-900/20 rounded-xl p-3 text-sm">
              <span className="font-medium text-neutral-600 dark:text-neutral-400">Assistant: </span>
              {voiceState.assistantResponse}
            </div>
          )}
        </div>
      )}

      {/* Conversation control button */}
      <Button 
        onClick={voiceState.conversationStarted ? stopConversation : startConversation}
        variant={voiceState.conversationStarted ? 'destructive' : 'primary'}
        size="icon"
        className="mt-6 rounded-full w-12 h-12 flex-shrink-0"
        disabled={voiceState.status === 'error'}
      >
        {voiceState.conversationStarted ? <PhoneOff size={20} /> : <Phone size={20} />}
      </Button>

      {/* Performance indicator - UPDATED FOR LIVEKIT */}
      {voiceState.conversationStarted && (
        <div className="mt-2 text-xs text-green-600 text-center">
          ✅ LiveKit WebRTC (Sub-200ms Optimized)
        </div>
      )}

      {/* Debug info - KEEPING EXACT SAME STRUCTURE */}
      {debug && voiceState.conversationStarted && (
        <div className="mt-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs w-full max-w-md">
          <h4 className="font-medium mb-2">Debug Info:</h4>
          <div className="space-y-1 text-neutral-600 dark:text-neutral-400">
            <div>Status: {voiceState.status}</div>
            <div>Connected: {voiceState.isConnected ? 'Yes' : 'No'}</div>
            <div>Conversation Started: {voiceState.conversationStarted ? 'Yes' : 'No'}</div>
            <div>User Speaking: {voiceState.isSpeaking ? 'Yes' : 'No'}</div>
            <div>Actually Playing: {voiceState.isActuallyPlaying ? 'Yes' : 'No'}</div>
            <div>Audio Level: {voiceState.audioLevel.toFixed(3)}</div>
            <div>Room State: {roomRef.current?.state || 'Not connected'}</div>
            <div>Agent Participant: {agentParticipantRef.current?.identity || 'None'}</div>
          </div>
        </div>
      )}
    </div>
  );
} 