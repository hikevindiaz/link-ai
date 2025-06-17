'use client';

import { Chat } from '@/components/chat-interface/chat';
import { useEffect, useState } from 'react';

export interface ChatWindowProps {
  params: { id: string };
  searchParams: { 
    withExitX?: string; 
    clientSidePrompt?: string;
    defaultMessage?: string;
    chatbox?: string;
    theme?: string;
  };
}

export default function ChatWindow({ params, searchParams }: ChatWindowProps) {
  const [chatbot, setChatbot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChatbot() {
      try {
        const response = await fetch(`/api/chatbots/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch chatbot');
        }
        const data = await response.json();
        setChatbot(data);
      } catch (error) {
        console.error('Error fetching chatbot:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchChatbot();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-neutral-500">Loading chat...</div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-500">Chatbot not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <Chat
        id={params.id}
        chatbotId={chatbot.id}
        selectedChatModel={chatbot.model?.name || chatbot.modelId}
        chatbotLogoURL={chatbot.chatbotLogoURL || undefined}
        chatTitle={chatbot.chatTitle || undefined}
        welcomeMessage={chatbot.welcomeMessage || undefined}
      />
    </div>
  );
}