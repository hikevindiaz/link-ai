import { Card } from "@/components/ui/homepage/card";
import { Button } from "@/components/Button";
import { RiAddFill } from "@remixicon/react";
import { LinkAIAgentIcon } from "@/components/icons/LinkAIAgentIcon";

interface EmptyStateProps {
  onCreateAgent: () => void;
}

export function EmptyState({ onCreateAgent }: EmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="sm:mx-auto sm:max-w-lg">
        <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-800">
          <div className="text-center">
            <LinkAIAgentIcon className="mx-auto text-[#121826] dark:text-white" />
            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-50">
              No Agent Selected
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Select an agent from the sidebar or create a new one to get started
            </p>
            <Button 
              variant="primary" 
              className="mt-6" 
              onClick={onCreateAgent}
            >
              <RiAddFill className="-ml-1 size-5 shrink-0" aria-hidden={true} />
              Create New Agent
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
} 