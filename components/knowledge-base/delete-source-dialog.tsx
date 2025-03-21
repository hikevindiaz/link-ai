'use client';

import { Button } from "@/components/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Source } from "./source-sidebar";

interface DeleteSourceDialogProps {
  sourceToDelete: Source | null;
  onClose: () => void;
  onDelete: (sourceId: string) => void;
}

export function DeleteSourceDialog({ 
  sourceToDelete, 
  onClose, 
  onDelete 
}: DeleteSourceDialogProps) {
  return (
    <Dialog open={!!sourceToDelete} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete Source</DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this knowledge source? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button
              variant="secondary"
              className="mt-2 w-full sm:mt-0 sm:w-fit"
              onClick={onClose}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button 
            variant="destructive"
            className="w-full sm:w-fit"
            onClick={() => sourceToDelete && onDelete(sourceToDelete.id)}
          >
            Delete Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 