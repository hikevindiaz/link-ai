'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { useState } from 'react';
import { Button } from '@/components/chat-interface/ui/button';
import { PlusIcon } from 'lucide-react';
import { generateUUID } from '@/lib/chat-interface/utils';

interface ChatHeaderProps {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: any;
  isReadonly: boolean;
}

export function ChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
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
