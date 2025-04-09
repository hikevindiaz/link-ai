'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { useState } from 'react';
import { Button } from '@/components/chat-interface/ui/button';
import { PlusIcon } from 'lucide-react';
import { generateUUID } from '@/lib/chat-interface/utils';
import { ChatLogo } from '@/components/chat-interface/chat-logo';

interface ChatHeaderProps {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: any;
  isReadonly: boolean;
  chatTitle?: string | null;
  chatbotLogoURL?: string | null;
}

export function ChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  chatTitle,
  chatbotLogoURL,
}: ChatHeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportDays, setExportDays] = useState(7);

  const handleNewChat = () => {
    // Simply refresh the page to start a new chat
    window.location.reload();
  };

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-4 md:px-4 h-12">
      <div className="flex w-full items-center justify-between">
        <div className="w-8 h-8 flex items-center justify-center">
          <ChatLogo chatbotLogoURL={chatbotLogoURL} size={32} />
        </div>
        <div className="flex-1 text-center">
          {chatTitle && (
            <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {chatTitle}
            </span>
          )}
        </div>
        <Button 
          onClick={handleNewChat}
          variant="outline" 
          size="icon" 
          className="size-8 rounded-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <PlusIcon className="size-4" />
          <span className="sr-only">New Chat</span>
        </Button>
      </div>
    </header>
  );
}
