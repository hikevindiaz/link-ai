import React, { forwardRef, useImperativeHandle } from 'react';
import { useWebRTCRealtime } from '@/hooks/use-webrtc-realtime';
import RiveVoiceOrb from '@/components/chat-interface/rive-voice-orb';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';

// VoiceInterface handle for parent components to access
export interface RealtimeVoiceInterfaceHandle {
  sendTextToSpeak: (text: string) => void;
}

interface RealtimeVoiceInterfaceProps {
  chatbotId?: string;
  welcomeMessage?: string;
  onTranscriptReceived: (transcript: string, isFinal: boolean) => void;
  debug?: boolean;
}

export const RealtimeVoiceInterface = forwardRef<RealtimeVoiceInterfaceHandle, RealtimeVoiceInterfaceProps>(
  ({ chatbotId, welcomeMessage, onTranscriptReceived, debug = false }, ref) => {
    // Use the WebRTC Realtime hook
    const {
      isCallActive,
      connectionState,
      sessionState,
      statusText,
      userTranscript,
      assistantTranscript,
      toggleCall,
      sendText,
      orbIsListening,
      orbIsUserSpeaking,
      orbIsProcessing,
      orbIsConnecting,
      orbIsSpeaking,
      orbAudioLevel,
    } = useWebRTCRealtime({
      chatbotId,
      welcomeMessage,
      debug,
      onTranscriptReceived,
      onSpeechComplete: () => {
        console.log('[RealtimeVoiceInterface] Speech complete');
      },
      onError: (error) => {
        console.error('[RealtimeVoiceInterface] Error:', error);
      },
      preConnect: true // Enable pre-connection for faster startup
    });

    // Expose the sendText method as sendTextToSpeak for compatibility
    useImperativeHandle(ref, () => ({
      sendTextToSpeak: sendText
    }));

    // Determine if we should show an error state
    const isError = connectionState === 'error';
    
    // Generate button text and variant
    const buttonText = isCallActive ? 'End Voice Call' : 'Start Voice Call';
    const buttonVariant = isCallActive ? 'destructive' : 'primary';
    
    // Connection status indicator
    const getConnectionStatus = () => {
      switch (connectionState) {
        case 'connecting':
          return 'Connecting...';
        case 'connected':
          return isCallActive ? 'Connected' : '';
        case 'reconnecting':
          return 'Reconnecting...';
        case 'error':
          return 'Connection Error';
        case 'disconnected':
          return isCallActive ? 'Disconnected' : '';
        default:
          return '';
      }
    };

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-background overflow-hidden">
        {/* Connection status (top right) */}
        {isCallActive && (
          <div className="absolute top-4 right-4 z-10">
            <span className={`text-xs px-2 py-1 rounded ${
              connectionState === 'connected' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : connectionState === 'error'
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            }`}>
              {getConnectionStatus()}
            </span>
          </div>
        )}
        
        {/* Main content container with scroll */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto overflow-y-auto">
          {/* RiveVoiceOrb visualization */}
          <div className="w-48 h-48 flex-shrink-0">
            <RiveVoiceOrb
              isListening={orbIsListening}
              isUserSpeaking={orbIsUserSpeaking}
              isThinking={orbIsProcessing || orbIsConnecting}
              isSpeaking={orbIsSpeaking}
              isWaiting={orbIsConnecting}
              isAsleep={false}
              audioLevel={orbAudioLevel}
            />
          </div>
          
          {/* Status text */}
          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
            {statusText}
            {debug && (
              <span className="ml-2 text-xs text-gray-500">
                (Session: {sessionState}, Connection: {connectionState})
              </span>
            )}
          </p>
          
          {/* Transcripts with proper scroll container */}
          {isCallActive && (userTranscript || assistantTranscript) && (
            <div className="mt-4 w-full max-w-md space-y-2 max-h-48 overflow-y-auto">
              {userTranscript && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">You: </span>
                  {userTranscript}
                </div>
              )}
              {assistantTranscript && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">Assistant: </span>
                  {assistantTranscript}
                </div>
              )}
            </div>
          )}
          
          {/* Call control button */}
          <Button 
            onClick={toggleCall}
            variant={buttonVariant}
            size="icon"
            className="mt-6 rounded-full w-12 h-12 flex-shrink-0"
            disabled={connectionState === 'connecting'}
          >
            {isCallActive ? <PhoneOff size={20} /> : <Phone size={20} />}
          </Button>
          
          {/* Error state */}
          {isError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm w-full max-w-md">
              <div className="flex items-center mb-2">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                <h3 className="font-medium text-red-800 dark:text-red-300">Connection Error</h3>
              </div>
              <p className="text-red-700 dark:text-red-200 mb-3">
                We're having trouble connecting to the voice service. Please try:
              </p>
              <ul className="list-disc list-inside text-red-700 dark:text-red-200 space-y-1 ml-2">
                <li>Check your internet connection</li>
                <li>Make sure you've granted microphone permissions</li>
                <li>Try refreshing the page</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
          )}

          {/* Debug information */}
          {debug && isCallActive && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs w-full max-w-md">
              <h4 className="font-medium mb-2">Debug Info:</h4>
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <div>Session State: {sessionState}</div>
                <div>Connection: {connectionState}</div>
                <div>Audio Level: {orbAudioLevel.toFixed(3)}</div>
                <div>User Speaking: {orbIsUserSpeaking ? 'Yes' : 'No'}</div>
                <div>AI Speaking: {orbIsSpeaking ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

RealtimeVoiceInterface.displayName = 'RealtimeVoiceInterface'; 