import { FileSearch, FileCheck2, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Conversation } from "@/types/inbox";

interface ThreadHeaderProps {
  conversation: Conversation;
  summaryGenerated: boolean;
  isSummarizing: boolean;
  isCheckingSummary: boolean;
  onSummarize: () => void;
  onDelete: () => void;
}

export function ThreadHeader({
  conversation,
  summaryGenerated,
  isSummarizing,
  isCheckingSummary,
  onSummarize,
  onDelete
}: ThreadHeaderProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
      <span className="text-sm text-gray-600">Source: {conversation.source ?? "Web Widget"}</span>
      <div className="flex items-center space-x-2">
        <Button
          variant={summaryGenerated ? "primary" : "secondary"}
          onClick={onSummarize}
          isLoading={isSummarizing || isCheckingSummary}
          loadingText={isCheckingSummary ? "Checking" : "Summarizing"}
          className="flex items-center gap-1.5"
        >
          {summaryGenerated ? (
            <>
              <FileCheck2 className="h-4 w-4" />
              View Summary
            </>
          ) : (
            <>
              <FileSearch className="h-4 w-4" />
              Summarize
            </>
          )}
        </Button>
        <button onClick={onDelete} className="text-red-500 hover:text-red-700">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
} 