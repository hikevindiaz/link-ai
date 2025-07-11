'use client';

import { Button } from "@/components/Button";
import { Card } from "@/components/ui/card";
import { RiDatabase2Line } from "@remixicon/react";

interface EmptyStateProps {
  onCreateSource: () => void;
}

export function EmptyState({ onCreateSource }: EmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="p-6 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col items-center max-w-md">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <RiDatabase2Line className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          
          <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
            No source selected
          </h3>
          
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 text-center">
            Select a source from the sidebar or create a new one to get started.
          </p>
          
          <Button onClick={onCreateSource} size="sm">
            Create New Source
          </Button>
        </div>
      </Card>
    </div>
  );
} 