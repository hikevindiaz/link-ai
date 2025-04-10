'use client';

import { Message } from 'ai';
import { useChat, type CreateMessage } from 'ai/react';
import { useState, useEffect, useCallback, useRef } from 'react';
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
      if (currentMode === 'voice' && message.role === 'assistant' && message.content && message.content !== lastSpokenMessageRef.current) {
        console.log("Speaking full finished message:", message.content.substring(0, 50) + "...");
        if (typeof sendTextToSpeak === 'function') {
             sendTextToSpeak(message.content);
             lastSpokenMessageRef.current = message.content;
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

  const {
    currentState: elevenLabsState,
    isApiKeyLoading,
    startSession: startElevenLabsSession,
    stopSession: stopElevenLabsSession,
    sendTextToSpeak,
    userTranscript: elevenLabsUserTranscript,
  } = useElevenlabsRealtime({
    chatbotId: chatbotId,
    voiceId: elevenLabsVoiceId,
    onTranscriptReceived: handleTranscriptReceived,
    onError: handleElevenLabsError,
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
      if (welcomeMessage) {
          setTimeout(() => {
             if (elevenLabsState !== 'idle' && elevenLabsState !== 'error') {
                 console.log("Speaking welcome message.");
                 sendTextToSpeak(welcomeMessage);
                 lastSpokenMessageRef.current = welcomeMessage;
             }
          }, 500);
      }
    }
  }, [isCallActive, startElevenLabsSession, stopElevenLabsSession, welcomeMessage, sendTextToSpeak, isApiKeyLoading, elevenLabsState]);

  const orbIsListening = isCallActive && elevenLabsState === 'listening';
  const orbIsSpeaking = isCallActive && elevenLabsState === 'speaking';
  const orbIsProcessing = isCallActive && (elevenLabsState === 'processing' || elevenLabsState === 'connecting');
  const orbIsUserSpeaking = isCallActive && elevenLabsUserTranscript.length > 0 && elevenLabsState === 'listening';

  let statusText = "Ready for voice call";
  if (isApiKeyLoading) {
    statusText = "Initializing voice system...";
  } else if (isCallActive) {
    switch (elevenLabsState) {
      case 'connecting':
        statusText = "Connecting...";
        break;
      case 'listening':
        statusText = orbIsUserSpeaking ? "User Speaking..." : "Listening...";
        break;
      case 'processing':
        statusText = "Processing...";
        break;
      case 'speaking':
        statusText = "Speaking...";
        break;
      case 'error':
        statusText = "Error - check console";
        break;
      case 'idle':
        statusText = "Call ended.";
        break;
      default:
        statusText = "Initializing...";
    }
  } else {
    statusText = "Ready for voice call";
  }

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
            isListening={orbIsListening || orbIsUserSpeaking}
            isThinking={orbIsProcessing}
            isSpeaking={orbIsSpeaking}
          />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
             {statusText}
          </p>
          {elevenLabsUserTranscript && (
             <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400 italic h-4 overflow-hidden">
               {elevenLabsUserTranscript}
             </p>
          )}
          <Button 
            onClick={handleCallToggle}
            variant={isCallActive ? "destructive" : "primary"}
            className="mt-6 rounded-full px-6 py-3"
            disabled={isApiKeyLoading || elevenLabsState === 'connecting'}
          >
            {isCallActive ? "End Call" : "Voice Call"}
          </Button>
        </div>
      )}
    </div>
  );
}
