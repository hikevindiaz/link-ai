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
import { RealtimeVoiceInterface, RealtimeVoiceInterfaceHandle } from '@/components/chat-interface/realtime-voice-interface';

interface Attachment {
  id: string;
  type: string;
  url: string;
}

interface ChatMessage extends Message {
  id: string; // Make id required to match the Messages component expectation
  attachments?: Attachment[];
}

// Type for the append function expected by child components
type AppendFunction = (message: Message | CreateMessage, chatRequestOptions?: any) => Promise<void>;

// This interface adapts to your existing schema
export interface ChatProps {
  chatbotId?: string;
  currentThreadId: string;
  welcomeMessage?: string;
  selectedChatModel?: string;
  selectedVisibilityType?: VisibilityType;
  chatbotLogoURL?: string;
  isReadonly?: boolean;
  chatTitle?: string;
}

export function Chat({
  chatbotId,
  currentThreadId,
  welcomeMessage,
  selectedChatModel = 'gpt-3.5-turbo',
  selectedVisibilityType = 'public',
  chatbotLogoURL,
  isReadonly = false,
  chatTitle,
}: ChatProps) {
  // State
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [currentMode, setCurrentMode] = useState<'text' | 'voice'>('text');
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const lastResponseRef = useRef<string | null>(null);
  
  // Custom hooks
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  
  // AI Chat SDK integration
  const {
    messages,
    append,
    reload,
    stop,
    isLoading,
    error,
    setMessages,
  } = useChat({
    id: currentThreadId,
    body: {
      chatbotId,
      selectedChatModel,
      selectedVisibilityType,
    },
    api: '/api/chat-interface',
    streamProtocol: 'text',
    onResponse: async (response) => {
      console.log('[Chat Interface] Response received, streaming started');
      if (response.status !== 200) {
        console.error(`[Chat Interface] Response error: ${response.status} ${response.statusText}`);
        toast.error('Error receiving response from AI');
      }
    },
    onFinish: (message) => {
      console.log('[Chat Interface] Message streaming complete:', message.id);
      lastResponseRef.current = message.content;
      
      // Force a re-render to ensure UI updates but don't re-fetch messages
      setMessages(prevMessages => {
        console.log('[Chat Debug] onFinish updating messages array, current count:', prevMessages.length);
        return [...prevMessages];
      });
      
      // Removed automatic TTS when in voice mode - voice interface handles its own responses
    },
    onError: (error) => {
      console.error('[Chat Interface] Streaming error:', error);
      toast.error('Error receiving message from AI. Please try again.');
      // Force a refresh of UI state to prevent stale state
      setMessages(prevMessages => [...prevMessages]);
    }
  });

  // Debug whenever messages change
  useEffect(() => {
    console.log('[Chat Debug] Messages updated:', messages.length);
    messages.forEach((msg, i) => {
      console.log(`[Chat Debug] Message ${i}: id=${msg.id || 'NO_ID'}, role=${msg.role}, content=${msg.content?.substring(0, 30) || 'empty'}...`);
    });
  }, [messages]);

  // Ensure all messages have IDs
  const messagesWithIds = useMemo(() => {
    const result = messages.map(msg => ({
      ...msg,
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }));
    console.log(`[Chat Debug] Processed ${result.length} messages with IDs`);
    return result;
  }, [messages]);

  // Helper status variables
  const status = isLoading ? 'streaming' : error ? 'error' : 'ready';
  
  // Debug whenever status changes
  useEffect(() => {
    console.log(`[Chat Debug] Status changed to: ${status}`);
  }, [status]);
  
  // Force refresh thread messages when thread ID changes
  useEffect(() => {
    if (currentThreadId) {
      // Manually fetch the latest messages to ensure we have everything
      console.log(`[Chat Debug] Thread ID changed, refreshing messages for ${currentThreadId}`);
      
      fetch(`/api/chat-interface?id=${currentThreadId}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages && Array.isArray(data.messages)) {
            console.log(`[Chat Debug] Fetched ${data.messages.length} messages from API`);
            setMessages(data.messages);
          }
        })
        .catch(err => {
          console.error(`[Chat Debug] Error fetching messages:`, err);
        });
    }
  }, [currentThreadId, setMessages]);

  // Refs to the voice interfaces for TTS - only need Realtime now
  const realtimeVoiceInterfaceRef = useRef<RealtimeVoiceInterfaceHandle>(null);

  // Mode change handler
  function handleModeChange(mode: 'text' | 'voice') {
    console.log("[Chat] Switching mode to:", mode);
    setCurrentMode(mode);
  }

  // Handle transcript from voice interface
  function handleTranscriptReceived(transcript: string, isFinal: boolean) {
    console.log(`[Chat] Transcript received (final: ${isFinal}):`, transcript);
    
    if (isFinal && transcript.trim()) {
      // Create message and append to chat
      const message: CreateMessage = {
        role: 'user',
        content: transcript,
      };
      
      handleAppend(message as any);
    }
  }

  // Handle LLM response for text-to-speech
  async function handleAppend(message: any) {
    console.log('[Chat] Appending message:', message);
    
    try {
      // Ensure message has an ID before appending
      if (!message.id) {
        message.id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Track state before append
      const messageCountBefore = messages.length;
      console.log(`[Chat Debug] Before append: ${messageCountBefore} messages, status=${status}`);
      
      // Add the message to the UI
      await append(message);
      
      // Track state after append
      console.log(`[Chat Debug] After append: ${messages.length} messages, status=${status}`);
      
    } catch (err) {
      console.error('[Chat] Error appending message:', err);
      toast.error('Failed to send message');
    }
  }

  // Handle message form submission
  async function handleMessageSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!input.trim() && !attachments.length) return;
    
    try {
      console.log(`[Chat Debug] Submitting message: ${input.substring(0, 30)}...`);
      
      const userMessage = {
        role: 'user',
        content: input,
        attachments,
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      } as ChatMessage;
      
      // Clear the input and attachments before sending
      setInput('');
      setAttachments([]);
      
      // Append the message
      await handleAppend(userMessage);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  }

  // Effect to check for streaming updates and force render - improve the implementation
  useEffect(() => {
    // More frequent updates during streaming to ensure UI reactivity
    const intervalId = setInterval(() => {
      if (isLoading) {
        // Force a re-render during streaming to ensure UI updates
        console.log('[Chat Debug] Forcing UI refresh during streaming');
        setMessages(prevMessages => [...prevMessages]);
      }
    }, 100); // Check very frequently - every 100ms during streaming
    
    return () => clearInterval(intervalId);
  }, [isLoading, setMessages]);

  // Add error recovery effect
  useEffect(() => {
    if (error) {
      console.error('[Chat Debug] Detected error state, attempting recovery:', error);
      // After a brief delay, try to recover from error state
      const timeoutId = setTimeout(() => {
        console.log('[Chat Debug] Attempting to refresh messages after error');
        setMessages(prevMessages => [...prevMessages]);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [error, setMessages]);

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
              status={status as any}
              messages={messagesWithIds as any}
              setMessages={setMessages as any}
              reload={reload}
              isReadonly={isReadonly}
              isArtifactVisible={isArtifactVisible}
              chatbotLogoURL={chatbotLogoURL}
              welcomeMessage={welcomeMessage}
            />
          </div>

          {!isReadonly && messagesWithIds.length === 0 && (
            <SuggestedActions
              chatId={currentThreadId}
              chatbotId={chatbotId}
              append={handleAppend as any}
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
                status={status as any}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messagesWithIds as any}
                setMessages={setMessages as any}
                append={handleAppend as any}
              />
            )}
          </form>
        </>
      ) : (
        // Voice interface - WebRTC Realtime API
        <RealtimeVoiceInterface
          chatbotId={chatbotId}
          welcomeMessage={welcomeMessage}
          onTranscriptReceived={handleTranscriptReceived}
          ref={realtimeVoiceInterfaceRef}
          debug={false}
        />
      )}
    </div>
  );
}
