'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { IconCheck, IconX, IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

interface CreateAddOnDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  templateAddOn?: any;
  onAddOnCreated?: () => void;
}

interface AddOnConfiguration {
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  active: boolean;
  metadata: {
    integration?: string;
    features: string[];
    setupInstructions?: string;
    apiEndpoints?: string[];
    webhookUrl?: string;
    [key: string]: any;
  };
}

const categoryOptions = [
  { value: 'integrations', label: 'Integrations', description: 'Third-party app connections' },
  { value: 'analytics', label: 'Analytics', description: 'Data analysis and reporting' },
  { value: 'ai', label: 'AI & Training', description: 'AI models and training features' },
  { value: 'communication', label: 'Communication', description: 'Messaging and communication tools' },
  { value: 'security', label: 'Security', description: 'Security and compliance features' },
  { value: 'automation', label: 'Automation', description: 'Workflow automation tools' },
];

const defaultConfiguration: AddOnConfiguration = {
  name: '',
  description: '',
  price: 1500, // $15.00 in cents
  currency: 'usd',
  category: 'integrations',
  active: true,
  metadata: {
    features: [],
    apiEndpoints: [],
  },
};

export function CreateAddOnDialog({ open, setOpen, templateAddOn, onAddOnCreated }: CreateAddOnDialogProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 1500,
    currency: 'usd',
    category: 'integrations',
    active: true,
  });

  useEffect(() => {
    if (!open) {
      setSaveStatus('idle');
      setFormData({
        name: '',
        description: '',
        price: 1500,
        currency: 'usd',
        category: 'integrations',
        active: true,
      });
    }
  }, [open]);

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      const response = await fetch('/api/admin/billing/add-ons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSaveStatus('success');
        toast.success('Add-on created successfully');
        setTimeout(() => {
          setOpen(false);
          onAddOnCreated?.();
        }, 1500);
      } else {
        setSaveStatus('error');
        toast.error('Failed to create add-on');
      }
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to create add-on');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
            Create Add-on
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Add-on Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter add-on name"
            />
          </div>

          <div className="space-y-2">
            <Label>Price (cents)</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Creating...' : 'Create Add-on'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 