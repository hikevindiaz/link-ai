import { cn } from "@/lib/utils"

interface UnifiedPageSkeletonProps {
  sidebarTitle?: string;
  hasAddButton?: boolean;
  itemCount?: number;
  showMainContent?: boolean;
  className?: string;
}

export function UnifiedPageSkeleton({ 
  sidebarTitle = "Loading...", 
  hasAddButton = true,
  itemCount = 6,
  showMainContent = true,
  className
}: UnifiedPageSkeletonProps) {
  return (
    <div className={cn("flex h-full overflow-hidden", className)}>
      {/* Left Sidebar Skeleton */}
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
            {hasAddButton && (
              <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
            )}
          </div>
        </div>
        
        <div className="mt-4 border-t border-neutral-200 dark:border-neutral-800" />
        
        <div className="px-4 pb-4 flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-2 mt-4">
            {Array.from({ length: itemCount }).map((_, i) => (
              <div 
                key={i}
                className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
                      <div className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
                    </div>
                    <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
                    <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      {showMainContent && (
        <div className="flex-1 overflow-auto">
          <div className="flex h-full flex-col items-center justify-center p-6">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-400"></div>
              </div>
              <div className="h-6 w-48 mx-auto mb-2 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
              <div className="h-4 w-64 mx-auto bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface UnifiedEmptyStateProps {
  icon: any;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: any;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: "secondary" | "ghost";
  };
  className?: string;
}

export function UnifiedEmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className
}: UnifiedEmptyStateProps) {
  return (
    <div className={cn("flex h-full flex-col items-center justify-center p-6", className)}>
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          {icon}
        </div>
        <h1 className="text-2xl font-normal text-neutral-700 dark:text-neutral-200">
          {title}
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
        {(primaryAction || secondaryAction) && (
          <div className="mt-6 flex justify-center gap-2">
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                {primaryAction.icon}
                {primaryAction.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors",
                  secondaryAction.variant === "ghost" 
                    ? "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700"
                )}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}