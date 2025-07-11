'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { IconPlus, IconUser, IconRobot } from "@tabler/icons-react";

interface CreateKnowledgeSourceDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onKnowledgeSourceCreated?: () => void;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Agent {
  id: string;
  name: string;
  userId: string;
}

export function CreateKnowledgeSourceDialog({ 
  open, 
  setOpen, 
  onKnowledgeSourceCreated 
}: CreateKnowledgeSourceDialogProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle');
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    userId: '',
    catalogMode: 'none',
    assignToAgents: false,
    selectedAgents: [] as string[]
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchAgents();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSaveStatus('idle');
      setFormData({
        name: '',
        description: '',
        userId: '',
        catalogMode: 'none',
        assignToAgents: false,
        selectedAgents: []
      });
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Knowledge source name is required');
      return;
    }

    if (!formData.userId) {
      toast.error('Please select an owner');
      return;
    }

    setSaveStatus('saving');
    
    try {
      const response = await fetch('/api/admin/knowledge-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          userId: formData.userId,
          catalogMode: formData.catalogMode === 'none' ? null : formData.catalogMode,
          assignToAgents: formData.assignToAgents,
          agentIds: formData.assignToAgents ? formData.selectedAgents : []
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Knowledge source created successfully');
        setOpen(false);
        onKnowledgeSourceCreated?.();
      } else {
        toast.error(data.error || 'Failed to create knowledge source');
      }
    } catch (error) {
      toast.error('Failed to create knowledge source');
      console.error('Error:', error);
    } finally {
      setSaveStatus('idle');
    }
  };

  const getAvailableAgents = () => {
    if (!formData.userId) return [];
    return agents.filter(agent => agent.userId === formData.userId);
  };

  const handleAgentToggle = (agentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAgents: prev.selectedAgents.includes(agentId)
        ? prev.selectedAgents.filter(id => id !== agentId)
        : [...prev.selectedAgents, agentId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
            <IconPlus className="h-5 w-5" />
            Create Knowledge Source
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter knowledge source name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter description (optional)"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner *</Label>
              <Select value={formData.userId} onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  userId: value,
                  selectedAgents: [] // Reset selected agents when owner changes
                }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <IconUser className="h-4 w-4" />
                        <span>{user.name || user.email}</span>
                        {user.name && (
                          <span className="text-neutral-500 text-sm">({user.email})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalogMode">Catalog Mode</Label>
              <Select value={formData.catalogMode} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, catalogMode: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select catalog mode (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Catalog Mode</SelectItem>
                  <SelectItem value="products">Products Catalog</SelectItem>
                  <SelectItem value="services">Services Catalog</SelectItem>
                  <SelectItem value="documents">Documents Catalog</SelectItem>
                  <SelectItem value="custom">Custom Catalog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Agent Assignment */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assignToAgents"
                checked={formData.assignToAgents}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    assignToAgents: !!checked,
                    selectedAgents: checked ? prev.selectedAgents : []
                  }))
                }
              />
              <Label htmlFor="assignToAgents" className="text-sm font-medium">
                Assign to Agents
              </Label>
            </div>

            {formData.assignToAgents && (
              <div className="space-y-3">
                {formData.userId ? (
                  <>
                    <Label className="text-sm text-neutral-600 dark:text-neutral-400">
                      Select agents to assign this knowledge source to:
                    </Label>
                    <div className="max-h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 space-y-2">
                      {getAvailableAgents().length === 0 ? (
                        <p className="text-sm text-neutral-500 text-center py-4">
                          No agents found for the selected owner
                        </p>
                      ) : (
                        getAvailableAgents().map((agent) => (
                          <div key={agent.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`agent-${agent.id}`}
                              checked={formData.selectedAgents.includes(agent.id)}
                              onCheckedChange={() => handleAgentToggle(agent.id)}
                            />
                            <Label htmlFor={`agent-${agent.id}`} className="text-sm flex items-center gap-2">
                              <IconRobot className="h-4 w-4" />
                              {agent.name}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-neutral-500">
                    Please select an owner first to see available agents
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={saveStatus === 'saving' || !formData.name.trim() || !formData.userId}
            >
              {saveStatus === 'saving' ? 'Creating...' : 'Create Knowledge Source'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 