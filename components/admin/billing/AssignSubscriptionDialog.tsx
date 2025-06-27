'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AssignSubscriptionDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedUser?: any;
  onSubscriptionAssigned?: () => void;
}

export function AssignSubscriptionDialog({ 
  open, 
  setOpen, 
  selectedUser, 
  onSubscriptionAssigned 
}: AssignSubscriptionDialogProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    if (!open) {
      setSaveStatus('idle');
      setSelectedPlan('');
    }
  }, [open]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/admin/billing/plans');
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans || []);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      }
    };

    if (open) {
      fetchPlans();
    }
  }, [open]);

  const handleAssign = async () => {
    setSaveStatus('saving');
    
    try {
      const response = await fetch('/api/admin/billing/subscriptions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser?.id,
          priceId: selectedPlan,
        }),
      });

      if (response.ok) {
        toast.success('Subscription assigned successfully');
        setOpen(false);
        onSubscriptionAssigned?.();
      } else {
        toast.error('Failed to assign subscription');
      }
    } catch (error) {
      toast.error('Failed to assign subscription');
    } finally {
      setSaveStatus('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
            Assign Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - ${(plan.price / 100).toFixed(0)}/{plan.interval}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={saveStatus === 'saving' || !selectedPlan}>
              {saveStatus === 'saving' ? 'Assigning...' : 'Assign Subscription'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 