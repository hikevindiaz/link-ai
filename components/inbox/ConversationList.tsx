import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Conversation } from "@/types/inbox";
import { getInitials, truncateText } from "@/types/inbox";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onRefresh?: () => void;
}

export function ConversationList({
  conversations,
  isLoading,
  selectedConversation,
  onSelectConversation,
  onRefresh
}: ConversationListProps) {
  return (
    <div className="px-4 pb-4 flex-1 overflow-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"></div>
          <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-400">Loading conversations...</span>
        </div>
      ) : conversations.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 mt-1">
          {conversations.map((conversation) => (
            <div 
              key={conversation.id} 
              onClick={() => onSelectConversation(conversation)}
              className={cn(
                "group transition-all duration-200 cursor-pointer p-3 rounded-lg border",
                "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                "hover:shadow-sm",
                "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
                "hover:border-neutral-300 dark:hover:border-neutral-700",
                conversation.unread && "border-neutral-400 dark:border-neutral-600",
                selectedConversation?.id === conversation.id && [
                  "border-neutral-400 dark:border-white",
                  "bg-neutral-50 dark:bg-neutral-900"
                ]
              )}
            >
              <div className="flex items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                  {getInitials(conversation.chatbotName)}
                </span>
                <div className="ml-3 w-full overflow-hidden">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center max-w-[70%]">
                      <div className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        {truncateText(conversation.title, 30)}
                      </div>
                      {conversation.unread && (
                        <Badge className="ml-2 flex-shrink-0 bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 text-xs px-1.5 py-0.5">
                          New
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 flex-shrink-0">
                      {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
                    {truncateText(conversation.subtitle, 75)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center py-8 text-center">
          <div className="flex flex-col items-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Your inbox is empty.
            </p>
            {onRefresh && (
              <Button 
                variant="secondary"
                className="mt-4"
                onClick={onRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Inbox
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 