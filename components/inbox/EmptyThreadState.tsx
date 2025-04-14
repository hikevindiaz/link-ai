import React from 'react';
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/Button";

export function EmptyThreadState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="max-w-md mx-auto">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
          <MessageSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
          No Conversation Selected
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
          Select a conversation from the sidebar to view messages and interact with your inbox.
        </p>
      </div>
    </div>
  );
} 