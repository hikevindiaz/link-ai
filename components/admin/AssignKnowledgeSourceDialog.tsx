'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { IconUsers, IconRobot, IconSearch } from "@tabler/icons-react";

interface AssignKnowledgeSourceDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  knowledgeSource: any;
  onAssignmentUpdated?: () => void;
}

interface Agent {
  id: string;
  name: string;
  userId: string;
  user: {
    name: string | null;
    email: string;
  };
  knowledgeSources: Array<{ id: string }>;
}

export function AssignKnowledgeSourceDialog({ 
  open, 
  setOpen, 
  knowledgeSource,
  onAssignmentUpdated 
}: AssignKnowledgeSourceDialogProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchAgents();
      setSearchTerm('');
    }
  }, [open]);

  useEffect(() => {
    if (knowledgeSource && agents.length > 0) {
      // Set initially selected agents based on current assignments
      const currentlyAssigned = agents
        .filter(agent => agent.knowledgeSources.some(ks => ks.id === knowledgeSource.id))
        .map(agent => agent.id);
      setSelectedAgents(currentlyAssigned);
    }
  }, [knowledgeSource, agents]);

  useEffect(() => {
    // Filter agents based on search term
    if (searchTerm) {
      const filtered = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAgents(filtered);
    } else {
      setFilteredAgents(agents);
    }
  }, [agents, searchTerm]);

  useEffect(() => {
    if (!open) {
      setSaveStatus('idle');
      setSelectedAgents([]);
    }
  }, [open]);

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

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      const response = await fetch(`/api/admin/knowledge-sources/${knowledgeSource.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentIds: selectedAgents
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Knowledge source assignments updated successfully');
        setOpen(false);
        onAssignmentUpdated?.();
      } else {
        toast.error(data.error || 'Failed to update assignments');
      }
    } catch (error) {
      toast.error('Failed to update assignments');
      console.error('Error:', error);
    } finally {
      setSaveStatus('idle');
    }
  };

  const getAssignmentStats = () => {
    const currentlyAssigned = agents.filter(agent => 
      agent.knowledgeSources.some(ks => ks.id === knowledgeSource?.id)
    ).length;
    
    const willBeAssigned = selectedAgents.length;
    
    return { currentlyAssigned, willBeAssigned };
  };

  if (!knowledgeSource) return null;

  const stats = getAssignmentStats();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
            <IconUsers className="h-5 w-5" />
            Assign Knowledge Source to Agents
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Knowledge Source Info */}
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
            <div className="space-y-2">
              <div className="font-medium text-neutral-900 dark:text-neutral-100">
                {knowledgeSource.name}
              </div>
              {knowledgeSource.description && (
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {knowledgeSource.description}
                </div>
              )}
              <div className="text-xs text-neutral-500">
                ID: {knowledgeSource.id}
              </div>
            </div>
          </div>

          {/* Assignment Stats */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">Currently assigned to: </span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {stats.currentlyAssigned} agent{stats.currentlyAssigned !== 1 ? 's' : ''}
                </span>
              </div>
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">Will be assigned to: </span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  {stats.willBeAssigned} agent{stats.willBeAssigned !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label>Search Agents</Label>
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search by agent name or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Agents List */}
          <div className="space-y-2">
            <Label>Select Agents ({filteredAgents.length} available)</Label>
            <div className="max-h-80 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-xl">
              {filteredAgents.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  {searchTerm ? 'No agents found matching your search' : 'No agents available'}
                </div>
              ) : (
                <div className="p-3 space-y-3">
                  {filteredAgents.map((agent) => {
                    const isCurrentlyAssigned = agent.knowledgeSources.some(ks => ks.id === knowledgeSource.id);
                    const isSelected = selectedAgents.includes(agent.id);
                    
                    return (
                      <div 
                        key={agent.id} 
                        className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors ${
                          isSelected 
                            ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20' 
                            : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <Checkbox
                          id={`agent-${agent.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleAgentToggle(agent.id)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <IconRobot className="h-4 w-4 text-neutral-500" />
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {agent.name}
                            </div>
                            {isCurrentlyAssigned && (
                              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded">
                                Currently Assigned
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">
                            Owner: {agent.user.name || agent.user.email}
                          </div>
                          <div className="text-xs text-neutral-400 font-mono">
                            {agent.id}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Updating...' : 'Update Assignments'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 