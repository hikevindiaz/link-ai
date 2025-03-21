import { Button } from "@/components/Button";
import { Divider } from "@/components/Divider";
import { FormSubmission } from "@/hooks/useForms";
import { formatDistanceToNow, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RiExternalLinkLine } from "@remixicon/react";

interface SubmissionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: FormSubmission | null;
}

export function SubmissionDetailsDialog({
  open,
  onOpenChange,
  submission,
}: SubmissionDetailsDialogProps) {
  if (!submission) return null;

  const formattedDate = submission.createdAt instanceof Date
    ? format(submission.createdAt, 'PPpp')
    : format(new Date(submission.createdAt), 'PPpp');

  const timeAgo = submission.createdAt instanceof Date
    ? formatDistanceToNow(submission.createdAt, { addSuffix: true })
    : formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submission Details</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Submission Meta */}
          <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Form</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {submission.formName || "Form"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Chatbot</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  {submission.chatbotName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Submitted</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50" title={formattedDate}>
                  {timeAgo}
                </p>
              </div>
              {submission.threadId && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Conversation</p>
                  <a
                    href={`/dashboard/conversations/${submission.threadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    View conversation
                    <RiExternalLinkLine className="ml-1 h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
          
          <Divider />
          
          {/* Submission Data */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-50">
              Form Data
            </h3>
            <div className="space-y-3">
              {Object.entries(submission.data).map(([fieldName, value]) => (
                <div key={fieldName} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {fieldName}
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
                    {value || "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 