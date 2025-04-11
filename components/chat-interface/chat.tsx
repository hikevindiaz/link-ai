'use client';

import { Message } from 'ai';
import { useChat, type CreateMessage } from 'ai/react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChatHeader } from '@/components/chat-interface/chat-header';
import { fetcher } from '@/lib/chat-interface/utils';
import { FixedChatInput } from '@/components/chat-interface/fixed-chat-input';
import { Messages } from '@/components/chat-interface/messages';
import { VisibilityType } from '@/components/chat-interface/visibility-selector';
import { useArtifactSelector } from '@/components/chat-interface/hooks/use-artifact';
import { SuggestedActions } from '@/components/chat-interface/suggested-actions';
import { toast } from 'sonner';
import RiveVoiceOrb from '@/components/chat-interface/rive-voice-orb';
import { useElevenlabsRealtime } from '@/hooks/use-elevenlabs-realtime';
import { Button } from '@/components/ui/button';
import useSWR from 'swr';
import { Chatbot } from '@prisma/client';

// Define the Attachment type locally since it's not exported from 'ai'
interface Attachment {
  name: string;
  type: string;
  url: string;
}

// Define our own Message type that extends the AI SDK Message type
interface ChatMessage extends Message {
  id: string; // Make id required
}

// Type for the append function expected by child components
type AppendFunction = (message: Message | CreateMessage, chatRequestOptions?: any) => Promise<void>;

// This interface adapts to your existing schema
export interface ChatProps {
  id: string;
  initialMessages?: ChatMessage[];
  chatbotId: string;
  selectedChatModel?: string;
  selectedVisibilityType?: VisibilityType;
  isReadonly?: boolean;
  chatbotLogoURL?: string | null;
  chatTitle?: string | null;
  testKnowledge?: string;
  welcomeMessage?: string | null;
  initialMode?: 'text' | 'voice';
}

export function Chat({
  id,
  initialMessages = [],
  chatbotId,
  selectedChatModel = 'gpt-4o-mini',
  selectedVisibilityType = 'public',
  isReadonly = false,
  chatbotLogoURL,
  chatTitle,
  testKnowledge,
  welcomeMessage,
  initialMode = 'text',
}: ChatProps) {
  const [currentThreadId] = useState(id.startsWith('thread_') ? id : `thread_${id}`);
  const [votes, setVotes] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [currentMode, setCurrentMode] = useState<'text' | 'voice'>(initialMode);
  const [isCallActive, setIsCallActive] = useState(false);
  const lastSpokenMessageRef = useRef<string | null>(null);
  const messageBeingSpokenRef = useRef<string | null>(null);
  const previousElevenLabsState = useRef<string>('idle');
  // Track if welcome message has been played
  const [hasPlayedWelcomeMessage, setHasPlayedWelcomeMessage] = useState(false);

  const { data: chatbotData } = useSWR<Chatbot>(chatbotId ? `/api/chatbots/${chatbotId}` : null, fetcher);
  const elevenLabsVoiceId = chatbotData?.voice || '21m00Tcm4TlvDq8ikWAM';

  const {
    messages,
    setMessages,
    handleSubmit: originalHandleSubmit,
    input,
    setInput,
    append: originalAppend,
    status,
    stop,
    reload,
    isLoading,
    error
  } = useChat({
    api: '/api/chat-interface',
    id: currentThreadId,
    body: {
      chatbotId,
      selectedChatModel,
      testKnowledge,
    },
    initialMessages: initialMessages.map(msg => ({
      ...msg,
      role: msg.role as 'user' | 'assistant' | 'system'
    })),
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('An error occurred during chat, please try again!');
    },
    streamProtocol: 'text',
    onFinish: (message) => {
      console.log('[Chat Interface] Response finished, dispatching event.');
      
      // Only speak if in voice mode, message is from assistant, and it hasn't been spoken already
      if (currentMode === 'voice' && 
          message.role === 'assistant' && 
          message.content && 
          message.content !== lastSpokenMessageRef.current &&
          // Only try to speak if we're not already speaking (prevents duplicate messages)
          elevenLabsState !== 'speaking' && 
          // Also don't speak if we're in the middle of processing speech
          elevenLabsState !== 'processing') {
        
        console.log("Speaking finished message:", message.content.substring(0, 50) + "...");
        
        if (typeof sendTextToSpeak === 'function') {
          // Update both references to track what's being spoken
          messageBeingSpokenRef.current = message.content;
          lastSpokenMessageRef.current = message.content;
          
          // Send the text to speak
          sendTextToSpeak(message.content);
        } else {
          console.warn("sendTextToSpeak is not available when trying to speak finished message.");
        }
      }
      
      window.dispatchEvent(new CustomEvent('newChatMessageSaved'));
    },
  });

  const append: AppendFunction = useCallback(async (message, options) => {
    let role: 'user' | 'assistant' | 'system' | 'data';
    if (message.role === 'user' || message.role === 'assistant' || message.role === 'system' || message.role === 'data') {
      role = message.role;
    } else {
      console.error(`Invalid role found in append: ${message.role}. Defaulting to user, but this might be incorrect.`);
      role = 'user';
    }

    const messageToSend = { ...message, role };

    await originalAppend(messageToSend, options);
  }, [originalAppend]);

  const handleTranscriptReceived = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal && transcript.trim()) {
      console.log("Final transcript received, appending:", transcript);
      append({ role: 'user', content: transcript });
    }
  }, [append]);

  const handleElevenLabsError = useCallback((errorMsg: string) => {
    console.error("ElevenLabs Hook Error:", errorMsg);
    toast.error(`Voice Error: ${errorMsg}`);
    setIsCallActive(false);
  }, []);

  // Add a state for audio level
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const handleAudioLevelChange = useCallback((level: number) => {
    setAudioLevel(level);
  }, []);

  const {
    currentState: elevenLabsState,
    isApiKeyLoading,
    startSession: startElevenLabsSession,
    stopSession: stopElevenLabsSession,
    stopRecording: stopElevenLabsRecording,
    sendTextToSpeak,
    userTranscript: elevenLabsUserTranscript,
    audioLevel: rawAudioLevel,
  } = useElevenlabsRealtime({
    chatbotId: chatbotId,
    voiceId: elevenLabsVoiceId,
    onTranscriptReceived: handleTranscriptReceived,
    onError: handleElevenLabsError,
    welcomeMessage: welcomeMessage || undefined,
    onAudioLevelChange: handleAudioLevelChange,
  });

  useEffect(() => {
    async function fetchVotes() {
      try {
        const data = await fetcher(`/api/chat-interface/votes?threadId=${currentThreadId}`);
        setVotes(data || []);
      } catch (error) {
        console.error('Failed to fetch votes', error);
      }
    }
    
    if (currentThreadId !== 'thread_new') {
      fetchVotes();
    }
  }, [currentThreadId]);

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await originalHandleSubmit(e);
    } catch (error) {
      console.error('Error submitting message:', error);
      toast.error('Failed to send message');
    }
  };

  const chatMessages = messages
    .map(msg => ({
      ...msg,
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })) as ChatMessage[];

  const handleModeChange = useCallback((newMode: 'text' | 'voice') => {
    console.log(`Switching mode to: ${newMode}`);
    if (currentMode === 'voice' && newMode === 'text') {
      if (isCallActive) {
        console.log("Stopping voice call due to mode switch.");
        stopElevenLabsSession();
        setIsCallActive(false);
      }
    } else if (currentMode === 'text' && newMode === 'voice' && !isCallActive) {
    }
    setCurrentMode(newMode);
  }, [currentMode, isCallActive, stopElevenLabsSession]);

  const handleCallToggle = useCallback(() => {
    if (isApiKeyLoading) {
      console.warn("Cannot start call: API key still loading.");
      toast.warning("Voice system is initializing, please wait...");
      return;
    }
    if (isCallActive) {
      console.log("Ending voice call manually...");
      stopElevenLabsSession();
      setIsCallActive(false);
    } else {
      console.log("Starting voice call manually...");
      startElevenLabsSession();
      setIsCallActive(true);
    }
  }, [isCallActive, startElevenLabsSession, stopElevenLabsSession, isApiKeyLoading]);

  // Add an effect to automatically update the call active status based on the current state
  useEffect(() => {
    // If state becomes 'idle' or 'error', we should update the call active status
    if (isCallActive && (elevenLabsState === 'idle' || elevenLabsState === 'error')) {
      console.log(`ElevenLabs state changed to ${elevenLabsState}, updating call status`);
      setIsCallActive(false);
    }
  }, [elevenLabsState, isCallActive]);

  // Modify the orbIsReady state to create a distinct neutral/idle state after welcome message
  const orbIsReady = useMemo(() => {
    // This is the neutral "ready for interaction" state after welcome message
    // where the orb is just waiting for user action (not actively listening yet)
    return isCallActive && 
      elevenLabsState === 'waiting' && 
      hasPlayedWelcomeMessage;
  }, [isCallActive, elevenLabsState, hasPlayedWelcomeMessage]);

  // Listening should only be when we're actively listening but not speaking yet
  const orbIsListening = useMemo(() => {
    return isCallActive && 
      elevenLabsState === 'listening' && 
      !elevenLabsUserTranscript.length;
  }, [isCallActive, elevenLabsState, elevenLabsUserTranscript.length]);

  // Improved user speaking detection - consider both transcript and audio level
  const orbIsUserSpeaking = useMemo(() => {
    // Detect user speaking when:
    // 1. Call is active and in listening state
    // 2. Either we have transcript text OR the audio level is above threshold (indicating speech)
    return isCallActive && 
      elevenLabsState === 'listening' && 
      (elevenLabsUserTranscript.length > 0 || audioLevel > 0.15);
  }, [isCallActive, elevenLabsState, elevenLabsUserTranscript.length, audioLevel]);

  // Processing speech to text
  const orbIsProcessing = isCallActive && elevenLabsState === 'processing';

  // When in connecting state, show as processing
  const orbIsConnecting = isCallActive && (
    elevenLabsState === 'connecting'
  );

  // Speaking state should be pure - only when we're actually speaking
  const orbIsSpeaking = isCallActive && elevenLabsState === 'speaking';

  // Base waiting state
  const orbIsWaiting = isCallActive && elevenLabsState === 'waiting';

  // Reset hasPlayedWelcomeMessage when ending a call
  useEffect(() => {
    if (!isCallActive) {
      setHasPlayedWelcomeMessage(false);
    }
  }, [isCallActive]);

  // Update effect to track when welcome message is played
  useEffect(() => {
    // When state transitions from speaking to waiting or listening
    // and we haven't set hasPlayedWelcomeMessage yet
    if (!hasPlayedWelcomeMessage && 
        previousElevenLabsState.current === 'speaking' && 
        (elevenLabsState === 'waiting' || elevenLabsState === 'listening')) {
      console.log("Welcome message seems to have finished, marking as played");
      setHasPlayedWelcomeMessage(true);
    }
    
    // When speech ends (state changes from speaking to something else)
    if (previousElevenLabsState.current === 'speaking' && 
        elevenLabsState !== 'speaking' && 
        messageBeingSpokenRef.current) {
      
      console.log("Speech finished, clearing message being spoken reference");
      messageBeingSpokenRef.current = null;
    }
    
    // Keep track of previous state transitions
    console.log(`[Voice State] Changed from ${previousElevenLabsState.current} to ${elevenLabsState}`);
    previousElevenLabsState.current = elevenLabsState;
  }, [elevenLabsState, hasPlayedWelcomeMessage]);

  // Update audio level calculation for more natural animation
  const orbAudioLevel = useMemo(() => {
    // When user is speaking, use actual audio level with dynamic amplification
    if (orbIsUserSpeaking) {
      const amplifiedLevel = Math.pow(audioLevel, 0.7) * 1.8;
      return Math.min(1, amplifiedLevel); 
    } 
    // When system is speaking, use moderate pulsing with slight randomness
    else if (orbIsSpeaking) {
      // Use more dynamic randomness for speaking to appear more natural
      return 0.5 + (Math.sin(Date.now() / 150) * 0.15); 
    } 
    // When processing, use subtle pulsing
    else if (orbIsProcessing || orbIsConnecting) {
      return 0.3 + (Math.sin(Date.now() / 300) * 0.05); // Gentle pulse
    } 
    // When ready for interaction (after welcome message), very subtle animation
    else if (orbIsReady) {
      return 0.1 + (Math.sin(Date.now() / 1500) * 0.05); // Very subtle breathing
    }
    // When in base listening mode, subtle animation
    else if (orbIsListening) {
      return 0.2 + (Math.sin(Date.now() / 800) * 0.05); // Subtle listening pulse
    }
    // When in explicit waiting state, minimal animation
    else if (orbIsWaiting && !hasPlayedWelcomeMessage) {
      return 0.15; // Less animation during initial setup
    }
    // Default minimal animation
    return 0.1;
  }, [
    orbIsUserSpeaking,
    orbIsSpeaking,
    orbIsProcessing,
    orbIsConnecting,
    orbIsWaiting,
    orbIsListening,
    orbIsReady,
    hasPlayedWelcomeMessage,
    audioLevel
  ]);

  // Improved status text to match desired flow
  let statusText = "Ready for voice call";
  if (isApiKeyLoading) {
    statusText = "Initializing...";
  } else if (isCallActive) {
    switch (elevenLabsState) {
      case 'connecting':
        statusText = "Connecting...";
        break;
      case 'waiting':
        statusText = hasPlayedWelcomeMessage 
          ? "I'm ready. What would you like to know?" 
          : "Getting ready...";
        break;
      case 'listening':
        statusText = orbIsUserSpeaking 
          ? "I'm listening..." 
          : "How can I help you?";
        break;
      case 'processing':
        statusText = "Processing...";
        break;
      case 'speaking':
        statusText = "I'm speaking...";
        break;
      case 'error':
        statusText = "Error with voice service";
        break;
      case 'idle':
        statusText = "Voice call ended";
        break;
      default:
        statusText = "Initializing...";
    }
  } else {
    statusText = "Click 'Voice Call' to start";
  }

  // Update the RiveVoiceOrb component props
  <RiveVoiceOrb
    isListening={orbIsListening}
    isUserSpeaking={orbIsUserSpeaking}
    isThinking={orbIsProcessing || orbIsConnecting}
    isSpeaking={orbIsSpeaking}
    isWaiting={orbIsWaiting || orbIsReady}
    audioLevel={orbAudioLevel}
  />

  return (
    <div className="chat-interface-container flex flex-col min-w-0 h-dvh bg-white dark:bg-gray-950">
      <ChatHeader
        chatId={currentThreadId}
        selectedModelId={selectedChatModel}
        selectedVisibilityType={selectedVisibilityType}
        isReadonly={isReadonly}
        chatTitle={chatTitle}
        chatbotLogoURL={chatbotLogoURL}
        currentMode={currentMode}
        onModeChange={handleModeChange}
      />

      {currentMode === 'text' ? (
        <>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto flex flex-col">
            <Messages
              chatId={currentThreadId}
              chatbotId={chatbotId}
              status={status}
              votes={votes}
              messages={chatMessages}
              setMessages={setMessages as any}
              reload={reload}
              isReadonly={isReadonly}
              isArtifactVisible={isArtifactVisible}
              chatbotLogoURL={chatbotLogoURL}
              welcomeMessage={welcomeMessage}
            />
          </div>

          {!isReadonly && messages.length === 0 && (
            <SuggestedActions
              chatId={currentThreadId}
              chatbotId={chatbotId}
              append={append}
            />
          )}

          <form 
            className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl" 
            onSubmit={handleMessageSubmit}
            noValidate
          >
            {!isReadonly && (
              <FixedChatInput
                chatId={currentThreadId}
                chatbotId={chatbotId}
                input={input}
                setInput={setInput}
                handleSubmit={handleMessageSubmit}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={chatMessages}
                setMessages={setMessages as any}
                append={append}
              />
            )}
          </form>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-background">
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
          </p>
          
          {elevenLabsUserTranscript && (
            <div className="mt-4 max-w-md w-full bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium text-indigo-600 dark:text-indigo-400">You: </span>
                {elevenLabsUserTranscript}
              </p>
            </div>
          )}
          
          <div className="flex flex-col gap-2 mt-6">
            <Button 
              onClick={handleCallToggle}
              variant={isCallActive ? "destructive" : "primary"}
              className="rounded-full px-6 py-3"
              disabled={isApiKeyLoading || elevenLabsState === 'connecting'}
            >
              {isCallActive ? "End Call" : "Voice Call"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
