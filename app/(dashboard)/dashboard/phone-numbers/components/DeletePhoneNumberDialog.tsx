import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface PhoneNumberToDelete {
  id: string;
  number: string;
  agentName?: string | null;
}

interface DeletePhoneNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: PhoneNumberToDelete | null;
  onDeleted?: () => void;
}

type DeleteState = 'confirming' | 'deleting' | 'success' | 'error';

export function DeletePhoneNumberDialog({
  open,
  onOpenChange,
  phoneNumber,
  onDeleted,
}: DeletePhoneNumberDialogProps) {
  const [deleteState, setDeleteState] = useState<DeleteState>('confirming');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Reset state when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Small delay to avoid visual flickering when closing
      setTimeout(() => {
        setDeleteState('confirming');
        setError(null);
      }, 300);
    }
    onOpenChange(open);
  };

  const handleDeletePhoneNumber = async () => {
    if (!phoneNumber) return;
    
    try {
      setDeleteState('deleting');
      setError(null);
      
      // Immediate feedback to user
      toast.loading('Deleting phone number...');
      
      const response = await fetch(`/api/twilio/phone-numbers/${phoneNumber.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete phone number');
      }
      
      // Change to success state
      setDeleteState('success');
      toast.dismiss();
      toast.success('Phone number deleted successfully');
      
      // Wait a moment to show success state before closing
      setTimeout(() => {
        if (onDeleted) {
          onDeleted();
        }
        router.refresh(); // Refresh the page to update the phone numbers list
        onOpenChange(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error deleting phone number:', error);
      setDeleteState('error');
      setError(error instanceof Error ? error.message : 'Failed to delete phone number');
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Failed to delete phone number');
    }
  };

  if (!phoneNumber) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 border dark:border-neutral-800">
        {deleteState === 'confirming' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground dark:text-neutral-100">Delete Phone Number</DialogTitle>
              <DialogDescription className="text-muted-foreground dark:text-neutral-400">
                Are you sure you want to delete this phone number? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                You are about to delete the phone number <span className="font-medium text-neutral-900 dark:text-white">{phoneNumber.number}</span>.
              </p>
              
              {phoneNumber.agentName && (
                <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                  This number is currently assigned to <span className="font-medium text-neutral-900 dark:text-white">{phoneNumber.agentName}</span> and will be unassigned.
                </p>
              )}
              
              <div className="mt-4 rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
                <div className="flex">
                  <Icons.warning className="h-5 w-5 text-amber-400 dark:text-amber-500" />
                  <div className="ml-3">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Deleting this phone number will:
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-300">
                      <li>Permanently remove it from your account</li>
                      <li>Release it back to numbers pool</li>
                      <li>Stop all billing associated with this number</li>
                      <li>End any active calls or messages being handled by this number</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="light" 
                onClick={() => onOpenChange(false)}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100 dark:border-neutral-700"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeletePhoneNumber}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                Delete Phone Number
              </Button>
            </DialogFooter>
          </>
        )}

        {deleteState === 'deleting' && (
          <div className="py-12 flex flex-col items-center justify-center">
            <Icons.spinner className="h-12 w-12 animate-spin text-neutral-500 dark:text-neutral-400 mb-6" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-2">
              Deleting Phone Number
            </h3>
            <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 max-w-sm">
              Please wait while we process your request. This may take a few moments.
            </p>
          </div>
        )}

        {deleteState === 'success' && (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
              <Icons.check className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-2">
              Phone Number Deleted
            </h3>
            <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 max-w-sm">
              The phone number {phoneNumber.number} has been successfully deleted from your account and released back to the number pool.
            </p>
          </div>
        )}

        {deleteState === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground dark:text-neutral-100">Error Deleting Phone Number</DialogTitle>
              <DialogDescription className="text-muted-foreground dark:text-neutral-400">
                We encountered a problem while trying to delete your phone number.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
                <div className="flex">
                  <Icons.warning className="h-5 w-5 text-red-400 dark:text-red-500" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {error || 'An unexpected error occurred. Please try again.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="light" 
                onClick={() => setDeleteState('confirming')}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100 dark:border-neutral-700"
              >
                Try Again
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onOpenChange(false)}
                className="dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100 dark:border-neutral-700"
              >
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 