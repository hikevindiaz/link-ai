import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import type { Agent } from "@/types/agent"
import { toast } from "sonner"
import { RiMoreFill, RiMessage2Line, RiUserLine, RiErrorWarningLine, RiDeleteBinLine, RiDraftLine, RiCheckboxCircleLine } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface AgentHeaderProps {
  agent: Agent;
  onChatClick?: () => void;
  onDeleteClick?: () => void;
  showActions?: boolean;
}

// Agent Status Badge Component
function AgentStatusBadge({ agent }: { agent: Agent }) {
  const hasPrompt = agent.prompt && agent.prompt.trim().length > 0;
  const baseClasses = "flex items-center gap-1 px-3 py-1 font-medium";
  
  if (hasPrompt) {
    return (
      <Badge variant="secondary" className={`${baseClasses} bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400`}>
        <RiCheckboxCircleLine className="h-3.5 w-3.5" />
        <span>Active</span>
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className={`${baseClasses} bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400`}>
      <RiDraftLine className="h-3.5 w-3.5" />
      <span>Draft</span>
    </Badge>
  );
}

export function AgentHeader({ agent, onChatClick, onDeleteClick, showActions = true }: AgentHeaderProps) {
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${type} copied to clipboard`)
  }

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => copyToClipboard(agent.name, "Name")}
                  className="text-2xl font-semibold tracking-tight dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  {agent.name}
                </button>
              </TooltipTrigger>
              <TooltipContent>Click to copy name</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AgentStatusBadge agent={agent} />
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => copyToClipboard(agent.id, "ID")}
                  className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  ID: {agent.id}
                </button>
              </TooltipTrigger>
              <TooltipContent>Click to copy ID</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary"
            size="sm"
            onClick={onChatClick}
            className="border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:hover:border-neutral-700 dark:text-neutral-100"
          >
            Talk to your agent
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <RiMoreFill className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Agent Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onChatClick}>
                  <RiMessage2Line className="mr-2 h-4 w-4" />
                  Chat with the new interface
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => window.location.href = `/dashboard/inquiries/${agent.id}`}>
                  <RiUserLine className="mr-2 h-4 w-4" />
                  User Inquiries
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => window.location.href = `/dashboard/errors/${agent.id}`}>
                  <RiErrorWarningLine className="mr-2 h-4 w-4" />
                  Errors
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem 
                onClick={onDeleteClick}
                className="text-red-600 dark:text-red-400"
              >
                <RiDeleteBinLine className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
} 