import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
}

export function SuccessDialog({ open, onOpenChange, threadId }: SuccessDialogProps) {
  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DialogContent className={cn(
        "sm:max-w-md bg-white dark:bg-gray-900 border dark:border-gray-800",
      )}>
        <DialogHeader className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 dark:text-green-400 mb-2" />
          <DialogTitle className="font-semibold text-gray-900 dark:text-gray-50 text-xl">
            Conversation Deleted
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Your conversation has been successfully deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex justify-center">
          <Button
            variant="primary"
            onClick={() => {
              onOpenChange(false);
              // Trigger a refresh of the conversations list and select next thread
              const event = new CustomEvent('inboxThreadDeleted', { 
                detail: { 
                  threadId: threadId,
                  selectNext: true 
                } 
              });
              window.dispatchEvent(event);
            }}
            className={cn(
              "w-full sm:w-32 bg-indigo-600 hover:bg-indigo-700 text-white",
              "dark:bg-indigo-600 dark:hover:bg-indigo-700"
            )}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 