import React, { forwardRef, useImperativeHandle } from 'react';
import { useVoiceInterfaceV2 } from '@/hooks/use-voice-interface-v2';
import RiveVoiceOrb from '@/components/chat-interface/rive-voice-orb';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';

// VoiceInterface handle for parent components to access
export interface VoiceInterfaceHandle {
  sendTextToSpeak: (text: string) => void;
}

interface VoiceInterfaceProps {
  chatbotId?: string;
  welcomeMessage?: string;
  onTranscriptReceived: (transcript: string, isFinal: boolean) => void;
}

export const VoiceInterfaceV2 = forwardRef<VoiceInterfaceHandle, VoiceInterfaceProps>(
  ({ chatbotId, welcomeMessage, onTranscriptReceived }, ref) => {
    // Use the voice interface hook
    const {
      isCallActive,
      statusText,
      userTranscript,
      orbIsListening,
      orbIsUserSpeaking,
      orbIsProcessing,
      orbIsConnecting,
      orbIsSpeaking,
      orbIsWaiting,
      orbIsReady,
      orbAudioLevel,
      toggleCall,
      sendTextToSpeak,
    } = useVoiceInterfaceV2({
      chatbotId,
      welcomeMessage,
      onTranscriptReceived,
    });

    // Expose the sendTextToSpeak method to parent components
    useImperativeHandle(ref, () => ({
      sendTextToSpeak
    }));

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-background">
        {/* RiveVoiceOrb visualization */}
        <RiveVoiceOrb
          isListening={orbIsListening}
          isUserSpeaking={orbIsUserSpeaking}
          isThinking={orbIsProcessing || orbIsConnecting}
          isSpeaking={orbIsSpeaking}
          isWaiting={orbIsWaiting || orbIsReady}
          isAsleep={false}
          audioLevel={orbAudioLevel}
        />
        
        {/* Hidden transcript - shown in UI but visually hidden for screen readers */}
        <span className="sr-only">{statusText}</span>
        
        {/* Only show transcript when active and user is speaking */}
        {isCallActive && userTranscript && (
          <div className="mt-2 max-w-md bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">You: </span>
            {userTranscript}
          </div>
        )}
        
        {/* Simple call control button */}
        <Button 
          onClick={toggleCall}
          variant={isCallActive ? "secondary" : "primary"}
          size="icon"
          className="mt-4 rounded-full"
        >
          {isCallActive ? <PhoneOff size={20} /> : <Phone size={20} />}
        </Button>
      </div>
    );
  }
);

VoiceInterfaceV2.displayName = 'VoiceInterfaceV2'; 