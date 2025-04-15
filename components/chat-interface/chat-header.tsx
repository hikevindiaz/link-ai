'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/chat-interface/ui/button';
import { PlusIcon } from 'lucide-react';
import { RiVoiceAiLine, RiChatAiLine } from '@remixicon/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatHeaderProps {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: any;
  isReadonly: boolean;
  chatTitle?: string | null;
  chatbotLogoURL?: string | null;
  currentMode: 'text' | 'voice';
  onModeChange: (mode: 'text' | 'voice') => void;
}

export function ChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  chatTitle,
  chatbotLogoURL,
  currentMode,
  onModeChange,
}: ChatHeaderProps) {
  const router = useRouter();

  const handleNewChat = () => {
    window.location.reload();
  };

  const handleModeToggle = () => {
    onModeChange(currentMode === 'text' ? 'voice' : 'text');
  };

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-4 h-12 z-10">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleModeToggle}
                variant="ghost"
                size="icon" 
                className="size-8 rounded-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                {currentMode === 'text' ? <RiVoiceAiLine className="size-5" /> : <RiChatAiLine className="size-5" />}
                <span className="sr-only">Switch to {currentMode === 'text' ? 'Voice' : 'Text'} Mode</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch to {currentMode === 'text' ? 'Voice' : 'Text'} Mode</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="flex-1 text-center overflow-hidden whitespace-nowrap text-ellipsis">
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
