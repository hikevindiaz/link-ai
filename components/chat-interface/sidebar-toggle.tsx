import type { ComponentProps } from 'react';

import { type SidebarTrigger, useSidebar } from '@/components/chat-interface/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/chat-interface/ui/tooltip';

import { SidebarLeftIcon } from '@/components/chat-interface/icons';
import { Button } from '@/components/chat-interface/ui/button';

export function SidebarToggle({
  className,
}: ComponentProps<typeof SidebarTrigger>) {
  const { toggleSidebar } = useSidebar();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleSidebar}
            variant="outline"
            className="md:px-2 md:h-fit dark:bg-black dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <SidebarLeftIcon size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent align="start">Toggle Sidebar</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
