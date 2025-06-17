'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { CatalogMode } from './types';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogMode?: CatalogMode;
  isDeleting: boolean;
  onConfirm: () => void;
  title?: string;
  description?: string;
  deleteProgress?: number;
}

export function DeleteDialog({
  open,
  onOpenChange,
  catalogMode,
  isDeleting,
  onConfirm,
  title = "Delete All Content",
  description = "Are you sure you want to delete all content? This action cannot be undone.",
  deleteProgress = 0
}: DeleteDialogProps) {
  // Helper function to get deletion status message
  const getDeletionStatus = () => {
    if (deleteProgress < 20) return 'Starting the deletion process...';
    if (deleteProgress < 40) return 'Removing products from catalog...';
    if (deleteProgress < 70) return 'Updating knowledge base...';
    if (deleteProgress < 90) return 'Finalizing changes in database...';
    return 'Almost done...';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl dark:bg-red-950 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              This action cannot be undone.
            </p>
          </div>
        </div>
        
        {isDeleting && deleteProgress > 0 && (
          <div className="space-y-2 mt-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />
                <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                  {getDeletionStatus()}
                </span>
              </div>
              <span className="font-medium text-neutral-600 dark:text-neutral-400">
                {deleteProgress}%
              </span>
            </div>
            <Progress 
              value={deleteProgress}
              className={cn(
                "h-1.5",
                "bg-neutral-100 text-neutral-600"
              )}
            />
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
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 