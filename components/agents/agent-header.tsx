import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import type { Agent } from "@/types/agent"
import { toast } from "sonner"
import { RiMoreFill, RiMessage2Line, RiUserLine, RiErrorWarningLine, RiDeleteBinLine } from "@remixicon/react"
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
                  className="text-2xl font-semibold tracking-tight dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {agent.name}
                </button>
              </TooltipTrigger>
              <TooltipContent>Click to copy name</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
            agent.status === 'live' 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            {agent.status === 'live' ? 'Live' : 'Draft'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => copyToClipboard(agent.id, "ID")}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            className="border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800 dark:hover:border-gray-700 dark:text-gray-100"
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
                <RiMoreFill className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
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