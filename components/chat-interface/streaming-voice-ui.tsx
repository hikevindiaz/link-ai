'use client';

import { useState, useCallback, useEffect } from 'react';
import { useStreamingVoice } from '@/hooks/use-streaming-voice';
import RiveVoiceOrb from './rive-voice-orb';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StreamingVoiceUIProps {
  chatbotId: string;
  voiceId?: string;
  welcomeMessage?: string;
  onTranscriptFinalized?: (transcript: string) => void;
  className?: string;
}

export function StreamingVoiceUI({
  chatbotId,
  voiceId,
  welcomeMessage = "Hello, how can I help you today?",
  onTranscriptFinalized,
  className
}: StreamingVoiceUIProps) {
  // Animation states for the orb
  const [orbAnimation, setOrbAnimation] = useState<
    'idle' | 'listening' | 'speaking' | 'processing' | 'user-speaking'
  >('idle');
  
  // Track the last complete transcript to avoid duplicates
  const [lastFinalizedTranscript, setLastFinalizedTranscript] = useState('');
  
  // Handle partial transcripts
  const handlePartialTranscript = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal && transcript !== lastFinalizedTranscript) {
      setLastFinalizedTranscript(transcript);
      if (onTranscriptFinalized) {
        onTranscriptFinalized(transcript);
      }
    }
  }, [lastFinalizedTranscript, onTranscriptFinalized]);
  
  // Handle errors
  const handleError = useCallback((message: string) => {
    toast.error(message);
  }, []);
  
  // Initialize streaming voice hook
  const {
    state,
    isLoading,
    startSession,
    stopSession,
    userTranscript,
    partialResponse,
    audioLevel,
    isSpeaking,
    isUserSpeaking
  } = useStreamingVoice({
    chatbotId,
    voiceId,
    welcomeMessage,
    onPartialTranscript: handlePartialTranscript,
    onError: handleError,
    allowBargeIn: true // Enable interruption for more natural conversation
  });
  
  // Update orb animation based on voice state
  useEffect(() => {
    if (isUserSpeaking) {
      setOrbAnimation('user-speaking');
    } else if (isSpeaking) {
      setOrbAnimation('speaking');
    } else if (state === 'processing') {
      setOrbAnimation('processing');
    } else if (state === 'listening') {
      setOrbAnimation('listening');
    } else {
      setOrbAnimation('idle');
    }
  }, [state, isSpeaking, isUserSpeaking]);
  
  // Calculate audio level for orb visualization
  const orbAudioLevel = isUserSpeaking 
    ? Math.min(1, Math.pow(audioLevel, 0.7) * 1.8)  // Amplify user audio
    : isSpeaking 
      ? 0.5 + (Math.sin(Date.now() / 150) * 0.15)  // More dynamic for speaking
      : state === 'processing'
        ? 0.3 + (Math.sin(Date.now() / 300) * 0.05)  // Gentle pulse for processing
        : state === 'listening'
          ? 0.2 + (Math.sin(Date.now() / 800) * 0.05)  // Subtle pulse for listening
          : 0.1 + (Math.sin(Date.now() / 1500) * 0.05);  // Very subtle for idle
  
  // Handle voice call button
  const handleCallToggle = useCallback(() => {
    if (state === 'idle' || state === 'error') {
      startSession();
    } else {
      stopSession();
    }
  }, [state, startSession, stopSession]);
  
  // Get status text based on current state
  const getStatusText = useCallback(() => {
    if (isLoading) return "Initializing...";
    
    switch (state) {
      case 'connecting':
        return "Connecting...";
      case 'listening':
        return isUserSpeaking ? "I'm listening..." : "How can I help you?";
      case 'processing':
        return "Processing...";
      case 'speaking':
        return "I'm speaking...";
      case 'error':
        return "Error with voice service";
      case 'idle':
        return "Click 'Voice Call' to start";
      default:
        return "Ready for voice call";
    }
  }, [state, isLoading, isUserSpeaking]);
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 relative bg-background",
      className
    )}>
      {/* Voice orb visualization */}
      <RiveVoiceOrb
        isListening={orbAnimation === 'listening'}
        isUserSpeaking={orbAnimation === 'user-speaking'}
        isThinking={orbAnimation === 'processing'}
        isSpeaking={orbAnimation === 'speaking'}
        isWaiting={orbAnimation === 'idle'}
        audioLevel={orbAudioLevel}
      />
      
      {/* Status text */}
      <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
        {getStatusText()}
      </p>
      
      {/* User speech transcript */}
      {userTranscript && (
        <div className="mt-4 max-w-md w-full bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">You: </span>
            {userTranscript}
          </p>
        </div>
      )}
      
      {/* AI response (streaming) */}
      {partialResponse && (
        <div className="mt-2 max-w-md w-full bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">AI: </span>
            {partialResponse}
          </p>
        </div>
      )}
      
      {/* Voice call control button */}
      <div className="flex flex-col gap-2 mt-6">
        <Button 
          onClick={handleCallToggle}
          variant={state !== 'idle' && state !== 'error' ? "destructive" : "primary"}
          className="rounded-full px-6 py-3"
          disabled={isLoading || state === 'connecting'}
        >
          {state !== 'idle' && state !== 'error' ? "End Call" : "Voice Call"}
        </Button>
        
        {state === 'error' && (
          <p className="text-xs text-red-500 text-center mt-1">
            Voice service unavailable. Please try again later.
          </p>
        )}
      </div>
    </div>
  );
} 