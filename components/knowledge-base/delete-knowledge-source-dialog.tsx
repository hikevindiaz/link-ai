'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { RiDeleteBinLine, RiDatabase2Line, RiCloudLine, RiBrainLine } from '@remixicon/react';

interface KnowledgeSource {
  id: string;
  name: string;
  description?: string;
}

interface DeleteKnowledgeSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceToDelete: KnowledgeSource | null;
  onConfirmDelete: (sourceId: string) => Promise<void>;
}

interface TabProgress {
  name: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  details: string;
}

export function DeleteKnowledgeSourceDialog({
  open,
  onOpenChange,
  sourceToDelete,
  onConfirmDelete
}: DeleteKnowledgeSourceDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [tabProgress, setTabProgress] = useState<TabProgress[]>([
    {
      name: 'File Tab',
      icon: <RiCloudLine className="h-4 w-4" />,
      status: 'pending',
      progress: 0,
      details: 'Preparing to delete files...'
    },
    {
      name: 'Text Tab',
      icon: <RiDatabase2Line className="h-4 w-4" />,
      status: 'pending',
      progress: 0,
      details: 'Preparing to delete text content...'
    },
    {
      name: 'QA Tab',
      icon: <RiDatabase2Line className="h-4 w-4" />,
      status: 'pending',
      progress: 0,
      details: 'Preparing to delete QA pairs...'
    },
    {
      name: 'Website Tab',
      icon: <RiDatabase2Line className="h-4 w-4" />,
      status: 'pending',
      progress: 0,
      details: 'Preparing to delete website content...'
    },
    {
      name: 'Catalog Tab',
      icon: <RiDatabase2Line className="h-4 w-4" />,
      status: 'pending',
      progress: 0,
      details: 'Preparing to delete catalog content...'
    },
    {
      name: 'Vector Store',
      icon: <RiBrainLine className="h-4 w-4" />,
      status: 'pending',
      progress: 0,
      details: 'Preparing to clean AI memory...'
    }
  ]);

  const updateTabProgress = (tabIndex: number, status: TabProgress['status'], progress: number, details: string) => {
    setTabProgress(prev => prev.map((tab, index) => 
      index === tabIndex ? { ...tab, status, progress, details } : tab
    ));
  };

  const simulateProgressSteps = async (tabIndex: number, tabName: string) => {
    // Step 1: Start processing
    updateTabProgress(tabIndex, 'processing', 10, `Starting ${tabName.toLowerCase()} deletion...`);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Delete from storage/bucket
    if (tabIndex === 0 || tabIndex === 4) { // File Tab or Catalog Tab (has images)
      updateTabProgress(tabIndex, 'processing', 30, `Removing files from storage...`);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Step 3: Delete from database
    updateTabProgress(tabIndex, 'processing', 60, `Removing database entries...`);
    await new Promise(resolve => setTimeout(resolve, 600));

    // Step 4: Clean vector store
    if (tabIndex !== 5) { // Not the Vector Store tab itself
      updateTabProgress(tabIndex, 'processing', 85, `Cleaning AI memory...`);
      await new Promise(resolve => setTimeout(resolve, 400));
    } else {
      updateTabProgress(tabIndex, 'processing', 85, `Finalizing vector cleanup...`);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Step 5: Complete
    updateTabProgress(tabIndex, 'complete', 100, `${tabName} cleanup complete`);
    await new Promise(resolve => setTimeout(resolve, 200));
  };

  const handleDelete = async () => {
    if (!sourceToDelete) return;

    setIsDeleting(true);
    setOverallProgress(0);

    try {
      // Reset all tab progress
      setTabProgress(prev => prev.map(tab => ({
        ...tab,
        status: 'pending',
        progress: 0,
        details: `Preparing to delete ${tab.name.toLowerCase()}...`
      })));

      // Start the actual deletion process
      const deletePromise = onConfirmDelete(sourceToDelete.id);

      // Simulate progress for each tab
      const totalTabs = tabProgress.length;
      for (let i = 0; i < totalTabs; i++) {
        const tab = tabProgress[i];
        await simulateProgressSteps(i, tab.name);
        
        // Update overall progress
        const newOverallProgress = Math.round(((i + 1) / totalTabs) * 100);
        setOverallProgress(newOverallProgress);
      }

      // Wait for the actual API call to complete
      await deletePromise;

      // Show final completion
      setOverallProgress(100);
      
      // Wait a moment to show completion, then close
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Reset state and close
      setIsDeleting(false);
      setOverallProgress(0);
      setTabProgress(prev => prev.map(tab => ({
        ...tab,
        status: 'pending',
        progress: 0,
        details: `Preparing to delete ${tab.name.toLowerCase()}...`
      })));
      onOpenChange(false);

    } catch (error) {
      console.error('Error deleting knowledge source:', error);
      
      // Mark current tab as error
      const currentTabIndex = tabProgress.findIndex(tab => tab.status === 'processing');
      if (currentTabIndex !== -1) {
        updateTabProgress(currentTabIndex, 'error', 0, 'Deletion failed');
      }
      
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status: TabProgress['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-neutral-300" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      // Only allow closing if not in the middle of deletion
      if (!isDeleting) onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiDeleteBinLine className="h-5 w-5 text-red-600" />
            Delete Knowledge Source
          </DialogTitle>
          <DialogDescription>
            {!isDeleting ? (
              "This will permanently delete all content across all tabs. This action cannot be undone."
            ) : (
              "Deleting knowledge source and cleaning up all associated data..."
            )}
          </DialogDescription>
        </DialogHeader>

        {sourceToDelete && !isDeleting && (
          <div className="mt-4 flex items-center space-x-3 p-4 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-900 dark:text-red-100">{sourceToDelete.name}</p>
              {sourceToDelete.description && (
                <p className="text-sm text-red-700 dark:text-red-300 mt-1 line-clamp-2">
                  {sourceToDelete.description}
                </p>
              )}
            </div>
          </div>
        )}

        {isDeleting && (
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Overall Progress
                </span>
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {overallProgress}%
                </span>
              </div>
              <Progress 
                value={overallProgress} 
                className="h-2 bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Tab-by-tab Progress */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Cleanup Progress by Tab
              </h4>
              <div className="space-y-2">
                {tabProgress.map((tab, index) => (
                  <div 
                    key={tab.name}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      tab.status === 'complete' && "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800",
                      tab.status === 'processing' && "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800",
                      tab.status === 'error' && "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800",
                      tab.status === 'pending' && "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getStatusIcon(tab.status)}
                      <div className="flex items-center gap-2">
                        {tab.icon}
                        <span className="text-sm font-medium">{tab.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                        {tab.details}
                      </span>
                      {tab.status === 'processing' && (
                        <div className="w-16">
                          <Progress value={tab.progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <RiDeleteBinLine className="mr-2 h-4 w-4" />
                Delete Knowledge Source
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 