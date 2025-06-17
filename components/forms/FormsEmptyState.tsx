import { Button } from "@/components/Button";
import { RiAddLine, RiFileList3Line } from "@remixicon/react";

interface FormsEmptyStateProps {
  hasExistingForms: boolean;
  onCreateForm: () => void;
}

export function FormsEmptyState({ hasExistingForms, onCreateForm }: FormsEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="flex max-w-md flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900">
          <RiFileList3Line className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
        </div>
        
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
          {hasExistingForms 
            ? "Select a form to view submissions" 
            : "Create your first form"}
        </h2>
        
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {hasExistingForms
            ? "Select a form from the sidebar to view its submissions or create a new form to collect information from your users."
            : "Forms allow your AI agents to collect structured information from users during conversations. Create your first form to get started."}
        </p>
        
        <Button 
          className="mt-6"
          onClick={onCreateForm}
        >
          <RiAddLine className="mr-2 h-4 w-4" />
          Create New Form
        </Button>
      </div>
    </div>
  );
} 