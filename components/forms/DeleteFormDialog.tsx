import { Button } from "@/components/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RiAlertLine } from "@remixicon/react";

interface DeleteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onDelete: () => void;
  onCancel: () => void;
}

export function DeleteFormDialog({
  open,
  onOpenChange,
  isDeleting,
  onDelete,
  onCancel,
}: DeleteFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <RiAlertLine className="h-6 w-6 text-red-600 dark:text-red-500" aria-hidden="true" />
          </div>
          <DialogTitle className="mt-3 text-center">Delete Form</DialogTitle>
          <DialogDescription className="mt-2 text-center">
            Are you sure you want to delete this form? This action cannot be undone and all form submissions will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-center sm:space-x-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isDeleting}
            className="mt-3 sm:mt-0"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isDeleting}
            loading={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 