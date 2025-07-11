import { Button } from "@/components/Button";
import { Card } from "@/components/ui/card";
import { RiAddLine, RiFileList3Line } from "@remixicon/react";

interface FormsEmptyStateProps {
  hasExistingForms: boolean;
  onCreateForm: () => void;
}

export function FormsEmptyState({ hasExistingForms, onCreateForm }: FormsEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="p-6 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col items-center max-w-md">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <RiFileList3Line className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          
          <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
            {hasExistingForms 
              ? "Select a form to view submissions" 
              : "Create your first form"}
          </h3>
          
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 text-center">
            {hasExistingForms
              ? "Select a form from the sidebar to view its submissions or create a new form to collect information from your users."
              : "Forms allow your AI agents to collect structured information from users during conversations. Create your first form to get started."}
          </p>
          
          <Button 
            onClick={onCreateForm}
            size="sm"
          >
            <RiAddLine className="mr-2 h-4 w-4" />
            Create New Form
          </Button>
        </div>
      </Card>
    </div>
  );
} 