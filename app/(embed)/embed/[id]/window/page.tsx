'use client';

import { Chat } from '@/components/chat-interface/chat';
import { ChatContainer } from '@/components/chat-interface/chat-container';
import { useEffect, useState } from 'react';
import { generateUUID } from '@/lib/chat-interface/utils';
import { db } from '@/lib/db';

export interface ChatComponentProps {
  params: { id: string };
  searchParams: { 
    withExitX?: string; 
    clientSidePrompt?: string;
    defaultMessage?: string;
    chatbox?: string;
    theme?: string;
  };
}

export default function EmbeddedChat({ params, searchParams }: ChatComponentProps) {
  const [chatbot, setChatbot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [threadId, setThreadId] = useState<string>(generateUUID());
  
  // Fetch chatbot data
  useEffect(() => {
    async function fetchChatbot() {
      try {
        const response = await fetch(`/api/chatbots/${params.id}`);
        if (!response.ok) {
          throw new Error('Chatbot not found');
        }
        const data = await response.json();
        setChatbot(data);
      } catch (error) {
        console.error('Error fetching chatbot:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchChatbot();
    }
  }, [params.id]);

  // Set initial message if provided
  useEffect(() => {
    if (searchParams.defaultMessage && !isLoading && chatbot) {
      // Could dispatch an event to set initial message
      // Or implement a way to set default messages through the Chat component
    }
  }, [searchParams.defaultMessage, isLoading, chatbot]);
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg text-gray-500">Loading chat...</div>
      </div>
    );
  }

  if (!chatbot && !isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg text-red-500">Chatbot not found</div>
      </div>
    );
  }

  return (
    <ChatContainer 
      className={`flex h-full w-full flex-col overflow-hidden ${
        searchParams.theme === 'dark' ? 'dark' : ''
      }`}
    >
      <div className="flex-1 relative h-[calc(100vh-0px)]">
        <Chat
          id={threadId}
          initialMessages={[]}
          chatbotId={params.id}
          selectedChatModel={chatbot?.modelId || 'gpt-4'}
          selectedVisibilityType="public"
          isReadonly={false}
          chatbotLogoURL={chatbot?.chatbotLogoURL}
          chatTitle={chatbot?.name}
        />
      </div>
    </ChatContainer>
  );
}