'use client'

import React from 'react';
import { Loader2, CheckCircle } from "lucide-react";
import { FileData } from './types';
import { RiBrainLine } from '@remixicon/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type DeleteProgress = 'deleting' | 'removing' | 'complete' | null;

interface DeleteFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileToDelete: FileData | null;
  isDeleting: boolean;
  deleteProgress: DeleteProgress;
  onConfirmDelete: () => void;
}

const DeleteFileDialog: React.FC<DeleteFileDialogProps> = ({
  open,
  onOpenChange,
  fileToDelete,
  isDeleting,
  deleteProgress,
  onConfirmDelete
}) => {
  return (
    <Dialog open={open} onOpenChange={(open) => {
      // Only allow closing if not in the middle of deletion
      if (!isDeleting) onOpenChange(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete File</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this file? Your agent will no longer have access to this information.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden text-ellipsis">
          {fileToDelete?.name}
        </div>
        
        {isDeleting && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {deleteProgress === 'deleting' 
                    ? "Starting to remove file from knowledge base..." 
                    : deleteProgress === 'removing'
                      ? "Cleaning up vector embeddings..."
                      : "Finalizing removal process..."}
                </span>
              </div>
            </div>
            <Progress value={deleteProgress === 'deleting' ? 25 : deleteProgress === 'removing' ? 60 : 90} className="h-2 bg-indigo-100 text-indigo-600" />
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
            onClick={onConfirmDelete} 
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteFileDialog; 