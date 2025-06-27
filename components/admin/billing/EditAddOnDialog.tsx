'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditAddOnDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  addOn: any;
  onAddOnUpdated?: () => void;
}

export function EditAddOnDialog({ open, setOpen, addOn, onAddOnUpdated }: EditAddOnDialogProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
  });

  useEffect(() => {
    if (open && addOn) {
      setFormData({
        name: addOn.name || '',
        description: addOn.description || '',
        price: addOn.price || 0,
      });
    }
  }, [open, addOn]);

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      const response = await fetch(`/api/admin/billing/add-ons/${addOn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSaveStatus('success');
        toast.success('Add-on updated successfully');
        setTimeout(() => {
          setOpen(false);
          onAddOnUpdated?.();
        }, 1500);
      } else {
        setSaveStatus('error');
        toast.error('Failed to update add-on');
      }
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to update add-on');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
            Edit Add-on
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Add-on Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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