'use client';

import { useState } from 'react';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CreateSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateSource: (name: string, type: string) => void;
}

export function CreateSourceDrawer({ 
  open, 
  onClose, 
  onCreateSource 
}: CreateSourceDialogProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a name for your source");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Default to 'files' type since we're not asking for type anymore
      await onCreateSource(name, 'files');
      setName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Source</DialogTitle>
          <DialogDescription>
            Enter a name for your new knowledge source.
          </DialogDescription>
        </DialogHeader>
        
        <form id="create-source-form" onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label 
              htmlFor="name" 
              className="text-sm font-medium text-gray-900 dark:text-gray-50"
            >
              Source Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter source name"
              required
              autoFocus
            />
          </div>
        </form>
        
        <DialogFooter>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            form="create-source-form"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            loadingText="Creating..."
          >
            Create Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 