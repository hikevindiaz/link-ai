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
    <header className="sticky top-0 z-50 flex items-center justify-between w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-4 py-2">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleNewChat}
        >
          <PlusIcon className="h-4 w-4" />
          <span className="sr-only">New chat</span>
        </Button>
        <h2 className="text-lg font-semibold">Chat</h2>
      </div>
      {/* Rest of the header content */}
    </header>
  );
}
