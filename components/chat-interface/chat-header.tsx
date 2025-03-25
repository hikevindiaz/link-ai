'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { memo } from 'react';
import { Button } from '@/components/chat-interface/ui/button';
import { PlusIcon } from 'lucide-react';
import { generateUUID } from '@/lib/chat-interface/utils';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  onNewChat,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: any;
  isReadonly: boolean;
  onNewChat?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { width: windowWidth } = useWindowSize();

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      const newChatId = generateUUID();
      
      // Always use the current path and append thread parameter for agent chats
      if (pathname.includes('/dashboard/agents/')) {
        router.push(`${pathname}?thread=${newChatId}`);
      } else {
        router.push(`/chat/${newChatId}`);
      }
      
      window.dispatchEvent(new CustomEvent('newChatRequested', { 
        detail: { newChatId } 
      }));
    }
  };

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <Button 
        onClick={handleNewChat}
        variant="outline" 
        size="icon" 
        className="size-8 rounded-sm dark:black dark:text-gray-100 dark:hover:bg-gray-800"
      >
        <PlusIcon className="size-4" />
        <span className="sr-only">New Chat</span>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
