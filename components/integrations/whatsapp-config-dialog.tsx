"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RiWhatsappFill } from '@remixicon/react';

interface WhatsAppConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppConfigDialog({ open, onOpenChange }: WhatsAppConfigDialogProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would save to the backend
      // For now, we'll just show success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('WhatsApp configuration saved successfully!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save WhatsApp configuration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <RiWhatsappFill className="h-5 w-5 text-green-600" />
            <DialogTitle>WhatsApp Configuration</DialogTitle>
          </div>
          <DialogDescription>
            Configure your WhatsApp Business integration settings. These settings apply to all phone numbers with WhatsApp enabled.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> WhatsApp Business API integration requires a verified business account. Your AI agents will be able to respond to customer messages on WhatsApp.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
            <Input
              id="webhook-url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-domain.com/webhook"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Receive message status updates and delivery receipts
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="verify-token">Verify Token (Optional)</Label>
            <Input
              id="verify-token"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="Your secure verify token"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Used to verify webhook calls are from WhatsApp
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="welcome-message">Default Welcome Message</Label>
            <Textarea
              id="welcome-message"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hi! Thanks for reaching out on WhatsApp. How can I help you today?"
              rows={3}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sent when customers first message your business
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 