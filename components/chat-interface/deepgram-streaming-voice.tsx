'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import RiveVoiceOrb from '@/components/chat-interface/rive-voice-orb';
import { toast } from 'sonner';

interface DeepgramStreamingVoiceProps {
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
}

export function DeepgramStreamingVoice({ 
  chatbotId, 
  welcomeMessage, 
  onTranscriptReceived,
  debug = false 
}: DeepgramStreamingVoiceProps) {
  
  // Performance timing
  const timingsRef = useRef<{
    streamStartTime?: number;
    speechStartTime?: number;
    firstTokenTime?: number;
    llmStartTime?: number;
    llmEndTime?: number;
    ttsStartTime?: number;
    ttsEndTime?: number;
    totalStartTime?: number;
  }>({});

  // State
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

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const currentTranscriptRef = useRef<string>('');
  const interimTranscriptRef = useRef<string>('');
  const ttsQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Initialize Deepgram WebSocket connection
  const initializeDeepgramConnection = useCallback(async () => {
    try {
      // Get Deepgram WebSocket URL from our API
      const response = await fetch('/api/voice/deepgram-websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          interim_results: true,
          utterance_end_ms: 1000,
          vad_events: true,
          endpointing: 300,
          encoding: 'linear16',
          sample_rate: 16000,
          channels: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get WebSocket URL: ${response.statusText}`);
      }

      const { websocket_url } = await response.json();
      
      // Create WebSocket connection
      const ws = new WebSocket(websocket_url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Deepgram Streaming] WebSocket connected');
        timingsRef.current.streamStartTime = performance.now();
        setVoiceState(prev => ({ ...prev, isConnected: true, status: 'connected' }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'SpeechStarted') {
          console.log('[Deepgram Streaming] Speech detected - TIMER STARTED');
          timingsRef.current.speechStartTime = performance.now();
          timingsRef.current.totalStartTime = performance.now();
          
          // Interrupt any current TTS playback
          if (voiceState.status === 'speaking' || voiceState.isActuallyPlaying) {
            if (audioElementRef.current) {
              audioElementRef.current.pause();
              audioElementRef.current.currentTime = 0;
            }
            ttsQueueRef.current = [];
            isPlayingRef.current = false;
            console.log('[Deepgram Streaming] Interrupted assistant - now listening');
          }
          
          setVoiceState(prev => ({ 
            ...prev, 
            status: 'listening', 
            isSpeaking: true,
            conversationStarted: true,
            isActuallyPlaying: false
          }));
        }

        if (data.type === 'UtteranceEnd') {
          console.log('[Deepgram Streaming] Utterance ended - processing transcript');
          
          const finalTranscript = currentTranscriptRef.current.trim();
          if (finalTranscript) {
            setVoiceState(prev => ({ 
              ...prev, 
              currentTranscript: finalTranscript,
              status: 'processing',
              isSpeaking: false
            }));
            
            // Process the final transcript
            processTranscript(finalTranscript);
          } else {
            // No valid transcript, return to listening
            setVoiceState(prev => ({ ...prev, status: 'connected', isSpeaking: false }));
          }
          
          // Reset transcript buffers
          currentTranscriptRef.current = '';
          interimTranscriptRef.current = '';
        }

        if (data.type === 'Results') {
          const transcript = data.channel.alternatives[0]?.transcript || '';
          
          if (data.is_final) {
            // Final result - accumulate
            currentTranscriptRef.current += transcript + ' ';
            console.log('[Deepgram Streaming] Final transcript:', transcript);
          } else {
            // Interim result - show real-time feedback
            interimTranscriptRef.current = transcript;
            console.log('[Deepgram Streaming] Interim:', transcript);
            
            // Update UI with interim transcript
            setVoiceState(prev => ({ 
              ...prev, 
              currentTranscript: currentTranscriptRef.current + transcript
            }));
          }
        }
      };

      ws.onerror = (error) => {
        console.error('[Deepgram Streaming] WebSocket error:', error);
        setVoiceState(prev => ({ ...prev, status: 'error', isConnected: false }));
        toast.error('Voice connection failed');
      };

      ws.onclose = () => {
        console.log('[Deepgram Streaming] WebSocket closed');
        setVoiceState(prev => ({ ...prev, isConnected: false }));
        cleanup();
      };

    } catch (error) {
      console.error('[Deepgram Streaming] Failed to initialize:', error);
      setVoiceState(prev => ({ ...prev, status: 'error' }));
      toast.error('Failed to initialize voice connection');
    }
  }, [chatbotId]);

  // Start audio streaming to Deepgram
  const startAudioStreaming = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      mediaStreamRef.current = stream;

      // Create audio context for processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Calculate audio level for visual feedback
          const sum = inputData.reduce((acc, val) => acc + Math.abs(val), 0);
          const audioLevel = sum / inputData.length;
          
          setVoiceState(prev => ({ ...prev, audioLevel }));

          // Convert to 16-bit PCM and send to Deepgram
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }

          wsRef.current.send(pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log('[Deepgram Streaming] Audio streaming started');

    } catch (error) {
      console.error('[Deepgram Streaming] Failed to start audio streaming:', error);
      setVoiceState(prev => ({ ...prev, status: 'error' }));
      toast.error('Could not access microphone');
    }
  }, []);

  // Process transcript through LLM
  const processTranscript = useCallback(async (transcript: string) => {
    try {
      console.log('[Deepgram Streaming] Processing transcript:', transcript);
      
      // Notify parent component
      onTranscriptReceived?.(transcript, true);

      // Build conversation context
      const conversationMessages = [
        ...voiceState.conversationHistory,
        { role: 'user' as const, content: transcript }
      ];

      // Start LLM processing
      timingsRef.current.llmStartTime = performance.now();
      console.log('[Deepgram Streaming] Starting LLM processing');

      const response = await fetch('/api/voice/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotId,
          messages: conversationMessages,
          threadId: `voice_stream_${chatbotId}`
        })
      });

      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status}`);
      }

      // Process streaming response
      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let sentenceBuffer = '';
      let isFirstToken = true;
      let isFirstSentence = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        sentenceBuffer += chunk;

        // Capture first token time
        if (isFirstToken && chunk.trim()) {
          timingsRef.current.firstTokenTime = performance.now();
          const ttft = timingsRef.current.firstTokenTime - (timingsRef.current.llmStartTime || 0);
          console.log(`[Deepgram Streaming] LLM TTFT: ${ttft.toFixed(2)}ms`);
          isFirstToken = false;
        }

        // Check for sentence boundaries for streaming TTS
        const sentenceEnders = /[.!?]\s/g;
        let match;
        let lastIndex = 0;

        while ((match = sentenceEnders.exec(sentenceBuffer)) !== null) {
          const sentence = sentenceBuffer.substring(lastIndex, match.index + 1).trim();
          if (sentence.length > 10) {
            streamTTS(sentence, isFirstSentence);
            isFirstSentence = false;
          }
          lastIndex = match.index + 2;
        }

        sentenceBuffer = sentenceBuffer.substring(lastIndex);
      }

      // Speak remaining text
      if (sentenceBuffer.trim().length > 5) {
        streamTTS(sentenceBuffer.trim(), isFirstSentence);
      }

      // Update conversation history
      setVoiceState(prev => ({
        ...prev,
        assistantResponse: fullResponse,
        conversationHistory: [
          ...prev.conversationHistory,
          { role: 'user', content: transcript },
          { role: 'assistant', content: fullResponse }
        ],
        status: 'connected'
      }));

      timingsRef.current.llmEndTime = performance.now();
      const totalTime = timingsRef.current.llmEndTime - (timingsRef.current.totalStartTime || 0);
      console.log(`[Deepgram Streaming] 🎯 TOTAL LATENCY: ${totalTime.toFixed(2)}ms`);

    } catch (error) {
      console.error('[Deepgram Streaming] Error processing transcript:', error);
      setVoiceState(prev => ({ ...prev, status: 'error' }));
      toast.error('Failed to process voice input');
    }
  }, [chatbotId, voiceState.conversationHistory, onTranscriptReceived]);

  // Streaming TTS
  const streamTTS = useCallback(async (text: string, isFirst: boolean = false) => {
    console.log(`[Deepgram Streaming] Queuing TTS: "${text.substring(0, 30)}..."`);
    
    ttsQueueRef.current.push(text);
    
    if (isFirst) {
      setVoiceState(prev => ({ ...prev, status: 'speaking' }));
    }
    
    if (!isPlayingRef.current) {
      await processTTSQueue();
    }
  }, []);

  // Process TTS queue
  const processTTSQueue = useCallback(async () => {
    if (isPlayingRef.current || ttsQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    
    while (ttsQueueRef.current.length > 0) {
      const text = ttsQueueRef.current.shift()!;
      
      try {
        timingsRef.current.ttsStartTime = performance.now();
        
        const response = await fetch('/api/voice/synthesize-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            chatbotId,
            voice: 'nova'
          })
        });

        if (!response.ok) {
          console.error(`TTS failed: ${response.statusText}`);
          continue;
        }

        // Handle streaming audio
        if (response.body) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          
          const audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Play audio
          await new Promise<void>((resolve) => {
            const audio = new Audio(audioUrl);
            audioElementRef.current = audio;
            
            audio.onplay = () => {
              setVoiceState(prev => ({ ...prev, isActuallyPlaying: true }));
              console.log('[Deepgram Streaming] Audio playback started');
            };
            
            audio.onended = () => {
              setVoiceState(prev => ({ ...prev, isActuallyPlaying: false }));
              URL.revokeObjectURL(audioUrl);
              resolve();
            };
            
            audio.onerror = () => {
              console.error('[Deepgram Streaming] Audio playback error');
              URL.revokeObjectURL(audioUrl);
              resolve();
            };
            
            audio.play().catch(console.error);
          });
        }
        
        timingsRef.current.ttsEndTime = performance.now();
        const ttsDuration = timingsRef.current.ttsEndTime - (timingsRef.current.ttsStartTime || 0);
        console.log(`[Deepgram Streaming] TTS completed: ${ttsDuration.toFixed(2)}ms`);
        
      } catch (error) {
        console.error('[Deepgram Streaming] TTS error:', error);
      }
    }
    
    isPlayingRef.current = false;
    setVoiceState(prev => ({ 
      ...prev, 
      status: prev.isConnected ? 'connected' : 'idle',
      isActuallyPlaying: false
    }));
  }, [chatbotId]);

  // Start conversation
  const startConversation = useCallback(async () => {
    if (voiceState.status === 'idle') {
      await initializeDeepgramConnection();
      await startAudioStreaming();
      
      // Auto-play welcome message if provided
      if (welcomeMessage) {
        streamTTS(welcomeMessage, true);
      }
    }
  }, [voiceState.status, initializeDeepgramConnection, startAudioStreaming, welcomeMessage, streamTTS]);

  // Stop conversation
  const stopConversation = useCallback(() => {
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
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    
    ttsQueueRef.current = [];
    isPlayingRef.current = false;
    currentTranscriptRef.current = '';
    interimTranscriptRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="voice-interface flex flex-col items-center space-y-6 p-6">
      {/* Voice Orb */}
      <div className="voice-orb-container">
        <RiveVoiceOrb 
          isListening={voiceState.status === 'listening'}
          isSpeaking={voiceState.status === 'speaking' || voiceState.isActuallyPlaying}
          audioLevel={voiceState.audioLevel}
          vadProbability={voiceState.isSpeaking ? 0.8 : 0.2}
        />
      </div>

      {/* Controls */}
      <div className="controls flex items-center space-x-4">
        {!voiceState.conversationStarted ? (
          <Button
            onClick={startConversation}
            disabled={voiceState.status === 'error'}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full flex items-center space-x-2"
          >
            <Phone className="w-5 h-5" />
            <span>Start Voice Chat</span>
          </Button>
        ) : (
          <Button
            onClick={stopConversation}
            variant="destructive"
            className="px-6 py-3 rounded-full flex items-center space-x-2"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Chat</span>
          </Button>
        )}
      </div>

      {/* Status Display */}
      <div className="status-display text-center space-y-2">
        <div className="status-indicator">
          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
            voiceState.status === 'connected' ? 'bg-green-500' :
            voiceState.status === 'listening' ? 'bg-blue-500' :
            voiceState.status === 'processing' ? 'bg-yellow-500' :
            voiceState.status === 'speaking' ? 'bg-purple-500' :
            voiceState.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
          }`} />
          <span className="text-sm font-medium capitalize">
            {voiceState.status === 'connected' ? 'Ready to listen' : voiceState.status}
          </span>
        </div>
        
        {voiceState.currentTranscript && (
          <div className="transcript bg-gray-50 dark:bg-gray-800 p-3 rounded-lg max-w-md">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              "{voiceState.currentTranscript}"
            </p>
          </div>
        )}
      </div>

      {/* Debug Info */}
      {debug && (
        <div className="debug-info text-xs text-gray-500 space-y-1">
          <div>Audio Level: {(voiceState.audioLevel * 100).toFixed(1)}%</div>
          <div>Speaking: {voiceState.isSpeaking ? 'Yes' : 'No'}</div>
          <div>Connected: {voiceState.isConnected ? 'Yes' : 'No'}</div>
          <div>Conversation: {voiceState.conversationHistory.length} messages</div>
        </div>
      )}
    </div>
  );
} 