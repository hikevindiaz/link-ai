import { MessageSquare } from "lucide-react";
import { Button } from "@/components/Button";

export function EmptyThreadState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
          <MessageSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          No Conversation Selected
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Select a conversation from the sidebar to view messages and interact with your inbox.
        </p>
      </div>
    </div>
  );
} 