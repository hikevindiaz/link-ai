'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { IconUser, IconRobot, IconCheck, IconX, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

interface EditAgentDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  agent: {
    id: string;
    name: string;
    userId: string;
    user: {
      name: string | null;
      email: string;
    };
  } | null;
  onAgentUpdated?: () => void;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface AgentData {
  id: string;
  name: string;
  userId: string;
  user: {
    name: string | null;
    email: string;
  };
}

export function EditAgentDialog({ open, setOpen, agent, onAgentUpdated }: EditAgentDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    userId: '',
  });

  // Fetch users for owner selection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    if (open) {
      fetchUsers();
    }
  }, [open]);

  // Fetch complete agent data when dialog opens
  useEffect(() => {
    const fetchAgentData = async () => {
      if (!agent?.id) return;
      
      setAgentLoading(true);
      try {
        const response = await fetch(`/api/admin/agents/${agent.id}`);
        if (response.ok) {
          const data = await response.json();
          setAgentData(data.agent);
          setFormData({
            name: data.agent.name,
            userId: data.agent.userId,
          });
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
      } finally {
        setAgentLoading(false);
      }
    };

    if (open && agent) {
      fetchAgentData();
    }
  }, [open, agent]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSaveStatus('idle');
      setFormData({ name: '', userId: '' });
      setAgentData(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!agent?.id || !formData.name.trim() || !formData.userId) {
      return;
    }

    setSaveStatus('saving');

    try {
      const response = await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          userId: formData.userId,
        }),
      });

      if (response.ok) {
        setSaveStatus('success');
        toast.success('Agent updated successfully');
        
        // Close dialog after showing success
        setTimeout(() => {
          setOpen(false);
          onAgentUpdated?.();
        }, 1500);
      } else {
        const error = await response.json();
        setSaveStatus('error');
        toast.error(error.message || 'Failed to update agent');
      }
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to update agent');
      console.error('Error updating agent:', error);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        );
      case 'success':
        return (
          <>
            <IconCheck className="h-4 w-4 mr-2" />
            Saved
          </>
        );
      case 'error':
        return (
          <>
            <IconX className="h-4 w-4 mr-2" />
            Error
          </>
        );
      default:
        return 'Save Changes';
    }
  };

  const getSaveButtonClass = () => {
    switch (saveStatus) {
      case 'saving':
        return 'bg-neutral-600 text-white cursor-not-allowed';
      case 'success':
        return 'bg-emerald-600 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      default:
        return '';
    }
  };

  const currentOwner = users.find(user => user.id === formData.userId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
            Edit Agent
          </DialogTitle>
        </DialogHeader>

        {agentLoading ? (
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agent Information */}
            <div className="space-y-4">
              <h3 className="text-base font-normal text-neutral-700 dark:text-neutral-200">
                Agent Information
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    <IconRobot className="h-5 w-5 shrink-0 inline mr-2" />
                    Agent Name
                  </Label>
                  <Input
                    id="agent-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter agent name"
                    disabled={saveStatus === 'saving'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-owner" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    <IconUser className="h-5 w-5 shrink-0 inline mr-2" />
                    Owner
                  </Label>
                  {usersLoading ? (
                    <div className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                  ) : (
                    <Select
                      value={formData.userId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, userId: value }))}
                      disabled={saveStatus === 'saving'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.name || 'No name'}
                              </span>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {user.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {currentOwner && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Currently owned by: {currentOwner.name || currentOwner.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={saveStatus === 'saving'}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveStatus === 'saving' || !formData.name.trim() || !formData.userId}
                className={`transition-all duration-200 ${getSaveButtonClass()}`}
              >
                {getSaveButtonContent()}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 