'use client';

import React, { useState } from 'react';
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconExternalLink } from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSuccess?: () => void;
}

interface Role {
  name: string;
  value: 'USER' | 'ADMIN';
}

const roles: Role[] = [
  { name: 'User', value: 'USER' },
  { name: 'Admin', value: 'ADMIN' },
];

type MessageType = 'success' | 'error' | 'warning';

interface Message {
  type: MessageType;
  content: string;
}

export function InviteUserDialog({ open, onOpenChange, onInviteSuccess }: InviteUserDialogProps) {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'USER' | 'ADMIN'>('USER');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !selectedRole) return;

    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409 || data.error?.includes('already has a pending invitation')) {
          setMessage({
            type: 'warning',
            content: 'Email already has pending invitation.'
          });
        } else {
          setMessage({
            type: 'error',
            content: 'Error sending invitation, please contact hi@getlinkai.com'
          });
        }
        return;
      }

      // Success case
      setMessage({
        type: 'success',
        content: 'Invitation has been sent successfully.'
      });
      
      setEmail('');
      setSelectedRole('USER');
      onInviteSuccess?.();
      
      // Close dialog after showing success message for a moment
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      setMessage({
        type: 'error',
        content: 'Error sending invitation, please contact hi@getlinkai.com'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setEmail('');
        setSelectedRole('USER');
        setMessage(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="sr-only">Invite new users</DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
            Invite new users
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Workspace administrators can add, manage, and remove members.{' '}
            <a
              href="https://docs.getlinkai.com"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400",
                "hover:underline hover:underline-offset-4 transition-colors duration-200"
              )}
            >
              Learn more about roles
              <IconExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </p>

          {/* Message Display */}
          {message && (
            <div className={cn(
              "mt-4 p-3 rounded-lg border text-sm",
              message.type === 'success' && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
              message.type === 'error' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
              message.type === 'warning' && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
            )}>
              {message.content}
            </div>
          )}
          
          <div className="mt-6">
            <form onSubmit={handleSubmit} className="sm:flex sm:items-center sm:gap-2">
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as 'USER' | 'ADMIN')}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 flex w-full items-center gap-2 sm:mt-0">
                <Input 
                  placeholder="Enter email address..." 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium transition-colors duration-200"
                  disabled={isLoading || !email}
                >
                  {isLoading ? 'Inviting...' : 'Invite'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 