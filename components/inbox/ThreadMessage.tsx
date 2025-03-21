import { User as UserIcon } from "lucide-react";

interface ThreadMessageProps {
  isUser: boolean;
  content: string;
  avatar?: string;
}

export function ThreadMessage({ isUser, content, avatar }: ThreadMessageProps) {
  if (isUser) {
    return (
      <div className="flex items-end justify-end space-x-2">
        <div className="bg-black dark:bg-gray-800 text-white px-4 py-2 text-sm rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none max-w-md">
          {content}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black dark:bg-gray-800 text-white text-xs">
          <UserIcon className="h-4 w-4" />
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex items-start justify-start space-x-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-200 text-gray-800 dark:text-gray-800 text-xs font-medium">
        {avatar}
      </span>
      <div className="bg-gray-100 dark:bg-gray-100 text-gray-900 dark:text-gray-900 px-4 py-2 text-sm rounded-tl-none rounded-tr-lg rounded-br-lg rounded-bl-lg max-w-md">
        {content}
      </div>
    </div>
  );
} 