import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface ProgressDialogProps {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  messages: Array<{
    type: 'info' | 'success' | 'error';
    content: string;
  }>;
  allowClose?: boolean;
}

export function ProgressDialog({
  title,
  description,
  open,
  onOpenChange,
  progress,
  status,
  messages,
  allowClose = true,
}: ProgressDialogProps) {
  const [canClose, setCanClose] = useState(allowClose);

  // Update canClose when status changes or allowClose changes
  useEffect(() => {
    setCanClose(status === 'completed' || status === 'error' || allowClose);
  }, [status, allowClose]);

  return (
    <Dialog open={open} onOpenChange={canClose ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md">
        {canClose && <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground" />}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="my-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>{getStatusText(status)}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 w-full" />
        </div>
        
        <div className="mt-4 max-h-48 overflow-y-auto border rounded-md p-2">
          {messages.length > 0 ? (
            <div className="space-y-2">
              {messages.map((message, index) => (
                <div key={index} className="flex items-start text-sm">
                  <span className="mr-2 flex-shrink-0">
                    {message.type === 'info' && <Info className="h-4 w-4 text-indigo-500" />}
                    {message.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {message.type === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                  </span>
                  <span className="flex-1">{message.content}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-16 text-sm text-gray-500">
              No messages yet...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStatusText(status: 'idle' | 'processing' | 'completed' | 'error') {
  switch (status) {
    case 'idle':
      return 'Waiting to start...';
    case 'processing':
      return 'Processing...';
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Error';
    default:
      return '';
  }
} 