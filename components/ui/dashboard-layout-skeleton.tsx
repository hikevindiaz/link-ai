import { Skeleton } from "@/components/ui/skeleton"

interface DashboardLayoutSkeletonProps {
  sidebarTitle?: string;
  hasAddButton?: boolean;
  itemCount?: number;
}

export function DashboardLayoutSkeleton({ 
  sidebarTitle = "Loading...", 
  hasAddButton = true,
  itemCount = 6 
}: DashboardLayoutSkeletonProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar Skeleton */}
      <div className="w-96 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32 bg-neutral-200 dark:bg-neutral-700" />
            {hasAddButton && (
              <Skeleton className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700" />
            )}
          </div>
        </div>
        
        <div className="mt-4 border-t border-neutral-200 dark:border-neutral-800" />
        
        <div className="px-4 pb-4 flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-2 mt-4">
            {/* List Item Skeletons */}
            {Array.from({ length: itemCount }).map((_, i) => (
              <div 
                key={i}
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black"
              >
                <div className="flex items-start space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700" />
                      <Skeleton className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                    <Skeleton className="h-3 w-full bg-neutral-200 dark:bg-neutral-700" />
                    <Skeleton className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 overflow-auto">
        <div className="flex h-full flex-col items-center justify-center p-6">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-400"></div>
            </div>
            <Skeleton className="h-6 w-48 mx-auto mb-2 bg-neutral-200 dark:bg-neutral-700" />
            <Skeleton className="h-4 w-64 mx-auto bg-neutral-200 dark:bg-neutral-700" />
          </div>
        </div>
      </div>
    </div>
  )
} 