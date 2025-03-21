import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/homepage/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Conversation } from "@/types/inbox";
import { getInitials, truncateText } from "@/types/inbox";
import { Button } from "@/components/Button";
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
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
          <span className="ml-2 text-sm text-gray-500">Loading conversations...</span>
        </div>
      ) : conversations.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 mt-1">
          {conversations.map((conversation) => (
            <Card 
              key={conversation.id} 
              asChild 
              onClick={() => onSelectConversation(conversation)}
              className={cn(
                "group transition-all duration-200 cursor-pointer",
                "hover:bg-gray-50 dark:hover:bg-gray-900",
                "hover:shadow-sm",
                "hover:border-gray-300 dark:hover:border-gray-700",
                conversation.unread && "border-indigo-400 dark:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-500/10",
                selectedConversation?.id === conversation.id && [
                  "border-indigo-500 dark:border-indigo-500",
                  "bg-indigo-50/50 dark:bg-indigo-500/5",
                  "ring-1 ring-indigo-500/20 dark:ring-indigo-500/20"
                ]
              )}
            >
              <div className="relative px-3.5 py-2.5">
                <div className="flex items-start">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-800 text-sm font-medium">
                    {getInitials(conversation.chatbotName)}
                  </span>
                  <div className="ml-3 w-full overflow-hidden">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center max-w-[70%]">
                        <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
                          {truncateText(conversation.title, 30)}
                        </div>
                        {conversation.unread && (
                          <Badge className="ml-2 flex-shrink-0">
                            New
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
                        {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-500">
                      {truncateText(conversation.subtitle, 75)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center py-8 text-center">
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
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