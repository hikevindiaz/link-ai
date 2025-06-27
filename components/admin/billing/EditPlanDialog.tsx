'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EditPlanDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  plan: any;
  onPlanUpdated?: () => void;
}

export function EditPlanDialog({ open, setOpen, plan, onPlanUpdated }: EditPlanDialogProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
  });

  useEffect(() => {
    if (open && plan) {
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price || 0,
      });
    }
  }, [open, plan]);

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      const response = await fetch(`/api/admin/billing/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Plan updated successfully');
        setOpen(false);
        onPlanUpdated?.();
      } else {
        toast.error('Failed to update plan');
      }
    } catch (error) {
      toast.error('Failed to update plan');
    } finally {
      setSaveStatus('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
            Edit Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
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
              {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 