'use client';

import { Message } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatHeader } from '@/components/chat-interface/chat-header';
import { fetcher } from '@/lib/chat-interface/utils';
import { FixedChatInput } from '@/components/chat-interface/fixed-chat-input';
import { Messages } from '@/components/chat-interface/messages';
import { VisibilityType } from '@/components/chat-interface/visibility-selector';
import { useArtifactSelector } from '@/components/chat-interface/hooks/use-artifact';
import { SuggestedActions } from '@/components/chat-interface/suggested-actions';
import { toast } from 'sonner';

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
}

export function Chat({
  id,
  initialMessages = [],
  chatbotId,
  selectedChatModel = 'gpt-3.5-turbo',
  selectedVisibilityType = 'public',
  isReadonly = false,
  chatbotLogoURL,
  chatTitle,
  testKnowledge,
  welcomeMessage,
}: ChatProps) {
  const [currentThreadId] = useState(id.startsWith('thread_') ? id : `thread_${id}`);
  const [votes, setVotes] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    setMessages,
    handleSubmit,
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
      toast.error('An error occurred, please try again!');
    },
    streamProtocol: 'text',
    onFinish: () => {
      console.log('[Chat Interface] Response finished, dispatching newChatMessageSaved event.');
      window.dispatchEvent(new CustomEvent('newChatMessageSaved'));
    }
  });

  // Create a wrapper around append that returns void and handles role type correctly
  const append = useCallback(async (message: Message) => {
    await originalAppend({
      ...message,
      role: message.role as 'user' | 'assistant' | 'system'
    });
  }, [originalAppend]);

  // Fetch votes if needed
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

  // Handle message submission
  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await handleSubmit(e);
    } catch (error) {
      console.error('Error submitting message:', error);
      toast.error('Failed to send message');
    }
  };

  // Convert messages to ChatMessage type by ensuring id exists
  const chatMessages = messages
    .map(msg => ({
      ...msg,
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })) as ChatMessage[];

  return (
    <div className="chat-interface-container flex flex-col min-w-0 h-dvh bg-white dark:bg-gray-950">
      <ChatHeader
        chatId={currentThreadId}
        selectedModelId={selectedChatModel}
        selectedVisibilityType={selectedVisibilityType}
        isReadonly={isReadonly}
        chatTitle={chatTitle}
        chatbotLogoURL={chatbotLogoURL}
      />

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto flex flex-col">
        <Messages
          chatId={currentThreadId}
          status={status}
          votes={votes}
          messages={chatMessages}
          setMessages={setMessages as any}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          chatbotId={chatbotId}
          chatbotLogoURL={chatbotLogoURL}
          welcomeMessage={welcomeMessage}
        />
      </div>

      {/* Show suggested actions only when there are no messages */}
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
            handleSubmit={handleSubmit}
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

      {/* Add legal text below the input form */}
      <div className="px-4 pb-2 text-center">
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          By using this chatbot, you agree to our{' '}
          <a
            href="https://getlinkai.com/legal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Terms of Service
          </a>
          {' and '}
          <a
            href="https://getlinkai.com/legal"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
}
