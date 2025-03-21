import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function LoadingState({ 
  text = "Loading...", 
  size = 'medium',
  className = ""
}: LoadingStateProps) {
  const sizeClasses = {
    small: "h-4 w-4",
    medium: "h-5 w-5",
    large: "h-6 w-6"
  };

  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{text}</span>
    </div>
  );
} 