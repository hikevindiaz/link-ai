'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import { ChatHeader } from '@/components/chat-interface/chat-header';
import { fetcher, generateUUID } from '@/lib/chat-interface/utils';
import { FixedChatInput } from '@/components/chat-interface/fixed-chat-input';
import { Messages } from '@/components/chat-interface/messages';
import { VisibilityType } from '@/components/chat-interface/visibility-selector';
import { useArtifactSelector } from '@/components/chat-interface/hooks/use-artifact';
import { toast } from 'sonner';

// This interface adapts to your existing schema
export interface ChatProps {
  id: string; // This can be your threadId
  initialMessages?: Array<Message>;
  chatbotId: string; // Using your chatbot/agent ID
  selectedChatModel?: string;
  selectedVisibilityType?: VisibilityType;
  isReadonly?: boolean;
  chatbotLogoURL?: string | null;
  chatTitle?: string | null;
  testKnowledge?: string; // Add this parameter for testing
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
}: ChatProps) {
  // Ensure the id is in the proper format for inbox integration
  // If it doesn't start with 'thread_', prefix it to ensure consistency
  const [currentThreadId, setCurrentThreadId] = useState(id.startsWith('thread_') ? id : `thread_${id}`);
  
  // Track if we need to reset
  const [shouldReset, setShouldReset] = useState(false);
  
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
  } = useChat({
    id: currentThreadId, // Use the properly formatted thread ID
    body: { 
      id: currentThreadId, // Send the proper thread ID format to the API
      chatbotId, 
      selectedChatModel,
      testKnowledge, // Pass the test knowledge to the API
    },
    // @ts-ignore - Type differences between ai-sdk versions
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      // Optionally refresh the inbox to show new messages
      // This could trigger an event that the inbox page listens for
      try {
        window.dispatchEvent(new CustomEvent('inboxThreadUpdated', {
          detail: { threadId: currentThreadId }
        }));
      } catch (error) {
        console.error('Error dispatching inbox update event:', error);
      }
    },
    onError: () => {
      toast.error('An error occurred, please try again!');
    },
    api: '/api/chat-interface', // Point to our custom endpoint that uses your schema
  });

  const [votes, setVotes] = useState<Array<any>>([]);
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  
  // Handle new chat request
  useEffect(() => {
    const handleNewChat = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.newChatId) {
        // Generate a new thread ID
        const newThreadId = `thread_${customEvent.detail.newChatId}`;
        
        // Clear all current messages and state
        setMessages([]);
        setInput('');
        setAttachments([]);
        setVotes([]);
        
        // Update the thread ID
        setCurrentThreadId(newThreadId);
        setShouldReset(true);
      }
    };
    
    // Listen for new chat events
    window.addEventListener('newChatRequested', handleNewChat);
    
    return () => {
      window.removeEventListener('newChatRequested', handleNewChat);
    };
  }, [setMessages, setInput, setAttachments]);
  
  // Reset the chat when thread ID changes
  useEffect(() => {
    if (shouldReset) {
      // Reset state after thread ID updated
      reload();
      setShouldReset(false);
    }
  }, [currentThreadId, shouldReset, reload]);

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

  // Simple wrapper for append to ensure correct types
  const handleAppend = async (message: Message): Promise<void> => {
    try {
      // @ts-ignore - Our type definitions might not match exactly with the library
      await append(message);
    } catch (error) {
      console.error('Error in append:', error);
    }
  };
  
  // Function to handle starting a new chat
  const handleNewChat = () => {
    const newThreadId = `thread_${generateUUID()}`;
    
    // Clear all messages and state
    setMessages([]);
    setInput('');
    setAttachments([]);
    setVotes([]);
    
    // Update the thread ID
    setCurrentThreadId(newThreadId);
    setShouldReset(true);
    
    // Update the URL to reflect the new thread
    const url = new URL(window.location.href);
    url.searchParams.set('thread', newThreadId.replace('thread_', ''));
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-white dark:bg-black">
      <ChatHeader
        chatId={currentThreadId}
        selectedModelId={selectedChatModel}
        selectedVisibilityType={selectedVisibilityType}
        isReadonly={isReadonly}
        onNewChat={handleNewChat} // Pass the new chat handler
      />

      <Messages
        chatId={currentThreadId}
        status={status}
        votes={votes}
        messages={messages}
        // @ts-ignore - Type differences between ai-sdk versions
        setMessages={setMessages}
        reload={reload}
        isReadonly={isReadonly}
        isArtifactVisible={isArtifactVisible}
        chatbotLogoURL={chatbotLogoURL}
        chatbotName={chatTitle}
      />

      <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        {!isReadonly && (
          <FixedChatInput
            chatId={currentThreadId}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            status={status}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            // @ts-ignore - Type differences between ai-sdk versions
            setMessages={setMessages}
            // @ts-ignore - Type differences between ai-sdk versions
            append={handleAppend}
          />
        )}
      </form>
    </div>
  );
}
