import { Button } from "@/components/ui/button";
import RiveVoiceOrb from "@/components/chat-interface/rive-voice-orb";
import { AlertCircle, Volume2, Mic } from "lucide-react";

interface VoiceInterfaceProps {
  isCallActive: boolean;
  statusText: string;
  userTranscript: string;
  orbIsListening: boolean;
  orbIsUserSpeaking: boolean;
  orbIsProcessing: boolean;
  orbIsConnecting: boolean;
  orbIsSpeaking: boolean;
  orbIsWaiting: boolean;
  orbIsReady: boolean;
  orbAudioLevel: number;
  useStreamingVoice: boolean;
  onCallToggle: () => void;
  onStreamingModeToggle: (useStreaming: boolean) => void;
  isApiKeyLoading?: boolean;
  isError?: boolean;
  onTestAudio?: () => void;
}

export function VoiceInterface({
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
  useStreamingVoice,
  onCallToggle,
  onStreamingModeToggle,
  isApiKeyLoading = false,
  isError = false,
  onTestAudio
}: VoiceInterfaceProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-background">
      <div className="absolute top-4 right-4">
        <button 
          className={`text-xs px-2 py-1 rounded ${useStreamingVoice ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
          onClick={() => onStreamingModeToggle(true)}
        >
          Streaming
        </button>
        <button 
          className={`text-xs px-2 py-1 rounded ml-2 ${!useStreamingVoice ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
          onClick={() => onStreamingModeToggle(false)}
        >
          Legacy
        </button>
      </div>
      
      <RiveVoiceOrb
        isListening={orbIsListening}
        isUserSpeaking={orbIsUserSpeaking}
        isThinking={orbIsProcessing || orbIsConnecting}
        isSpeaking={orbIsSpeaking}
        isWaiting={orbIsWaiting || orbIsReady}
        audioLevel={orbAudioLevel}
      />
      
      <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
        {statusText}
        {useStreamingVoice && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Streaming Mode</span>}
      </p>
      
      <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
        <Button 
          onClick={onCallToggle}
          disabled={isApiKeyLoading}
          variant={isCallActive ? "destructive" : "primary"}
          className="w-full"
        >
          {isCallActive ? 'End Voice Call' : 'Start Voice Call'}
        </Button>
        
        {onTestAudio && (
          <Button 
            onClick={onTestAudio}
            variant="secondary"
            className="w-full text-sm"
            size="sm"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Test Audio System
          </Button>
        )}
        
        {userTranscript && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
            <div className="text-xs font-medium mb-1 text-gray-500">You said:</div>
            <p className="text-gray-700 dark:text-gray-300">{userTranscript}</p>
          </div>
        )}
        
        {isError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <h3 className="font-medium text-red-800 dark:text-red-300">Voice Service Error</h3>
            </div>
            <p className="text-red-700 dark:text-red-200 mb-3">
              We're having trouble connecting to the voice service. Please try the following:
            </p>
            <ul className="list-disc list-inside text-red-700 dark:text-red-200 space-y-2 ml-2">
              <li>Check your internet connection</li>
              <li>Click the "Test Audio System" button to verify your speakers work</li>
              <li>Make sure you've granted microphone permissions</li>
              <li>Try refreshing the page</li>
              <li>If on mobile, make sure your device isn't on silent mode</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 