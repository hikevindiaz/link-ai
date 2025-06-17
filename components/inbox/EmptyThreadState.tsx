import React from 'react';
import { MessageSquare } from "lucide-react";

export function EmptyThreadState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <MessageSquare className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
        </div>
        <h1 className="text-2xl font-normal text-neutral-700 dark:text-neutral-200">
          No Conversation Selected
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Select a conversation from the sidebar to view messages.
        </p>
      </div>
    </div>
  );
} 