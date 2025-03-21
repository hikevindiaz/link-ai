'use client';

import { Button } from "@/components/Button";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  onCreateSource: () => void;
}

export function EmptyState({ onCreateSource }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-md text-center">
        <h3 className="text-xl font-semibold mb-2">No source selected</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Select a source from the sidebar or create a new one to get started.
        </p>
        <Button onClick={onCreateSource}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Source
        </Button>
      </div>
    </div>
  );
} 