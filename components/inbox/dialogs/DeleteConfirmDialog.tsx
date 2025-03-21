import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import { Button } from "@/components/Button";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmDialog({ 
  open, 
  onOpenChange, 
  onDelete, 
  isDeleting 
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="absolute right-0 top-0 pr-3 pt-3">
          <DialogClose className="rounded-tremor-small p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </DialogClose>
        </div>
        <DialogHeader>
          <DialogTitle className="font-semibold text-gray-900 dark:text-gray-50">
            Delete Conversation
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            This conversation and all its messages will be permanently deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onDelete}
            isLoading={isDeleting}
            loadingText="Deleting"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 