'use client';

import { useEffect, useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { ChatContainer } from '@/components/chat-interface/chat-container';
import { Chat } from '@/components/chat-interface/chat';
import { generateUUID } from '@/lib/chat-interface/utils';
import RiveGlint from '@/components/chat-interface/rive-glint';

interface ChatPageProps {
  params: {
    agentId: string;
  };
}

export default function AgentChatPage({ params }: ChatPageProps) {
  const { agentId } = params;
  const searchParams = useSearchParams();
  const threadParam = searchParams ? searchParams.get('thread') : null;
  
  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [threadId, setThreadId] = useState<string>('');

  // Fetch agent data
  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch(`/api/chatbots/${agentId}`);
        if (!response.ok) {
          throw new Error('Agent not found');
        }
        const data = await response.json();
        setAgent(data);
      } catch (error) {
        console.error('Error fetching agent:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  // Generate a thread ID for this chat session
  useEffect(() => {
    if (!threadId) {
      // Use thread ID from URL if available, otherwise generate a new one
      const newThreadId = threadParam || generateUUID();
      setThreadId(newThreadId);
    }
  }, [threadId, threadParam]);

  // Handle URL changes for thread ID
  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlThreadId = urlParams.get('thread');
      
      if (urlThreadId && urlThreadId !== threadId) {
        setThreadId(urlThreadId);
      }
    };
    
    // Listen for popstate event (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [threadId]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RiveGlint 
            isThinking={true} 
            className="w-20 h-20" 
          />
          <div className="text-sm text-neutral-500">Loading agent...</div>
        </div>
      </div>
    );
  }

  if (!agent && !isLoading) {
    return notFound();
  }

  return (
    <ChatContainer className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex-1 relative h-[calc(100vh-64px)]">
        <Chat
          currentThreadId={threadId}
          chatbotId={agentId}
          selectedChatModel={agent?.modelId || 'gpt-4'}
          selectedVisibilityType="private"
          isReadonly={false}
          chatbotLogoURL={agent?.chatbotLogoURL}
          chatTitle={agent?.name}
          welcomeMessage={agent?.welcomeMessage}
        />
      </div>
    </ChatContainer>
  );
} 