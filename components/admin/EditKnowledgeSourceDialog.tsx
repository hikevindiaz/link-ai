'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { toast } from "sonner";
import { IconPencil, IconUser } from "@tabler/icons-react";

interface EditKnowledgeSourceDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  knowledgeSource: any;
  onKnowledgeSourceUpdated?: () => void;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

export function EditKnowledgeSourceDialog({ 
  open, 
  setOpen, 
  knowledgeSource,
  onKnowledgeSourceUpdated 
}: EditKnowledgeSourceDialogProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle');
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    userId: '',
    catalogMode: ''
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    if (knowledgeSource && open) {
      setFormData({
        name: knowledgeSource.name || '',
        description: knowledgeSource.description || '',
        userId: knowledgeSource.userId || '',
        catalogMode: knowledgeSource.catalogMode || 'none'
      });
    }
  }, [knowledgeSource, open]);

  useEffect(() => {
    if (!open) {
      setSaveStatus('idle');
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

  const handleUpdate = async () => {
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
      const response = await fetch(`/api/admin/knowledge-sources/${knowledgeSource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          userId: formData.userId,
          catalogMode: formData.catalogMode === 'none' ? null : formData.catalogMode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Knowledge source updated successfully');
        setOpen(false);
        onKnowledgeSourceUpdated?.();
      } else {
        toast.error(data.error || 'Failed to update knowledge source');
      }
    } catch (error) {
      toast.error('Failed to update knowledge source');
      console.error('Error:', error);
    } finally {
      setSaveStatus('idle');
    }
  };

  if (!knowledgeSource) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
            <IconPencil className="h-5 w-5" />
            Edit Knowledge Source
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Knowledge Source Info */}
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
            <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
              <div><strong>ID:</strong> {knowledgeSource.id}</div>
              <div><strong>Created:</strong> {new Date(knowledgeSource.createdAt).toLocaleString()}</div>
              <div><strong>Last Updated:</strong> {new Date(knowledgeSource.updatedAt).toLocaleString()}</div>
            </div>
          </div>

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
              <Select value={formData.userId} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, userId: value }))
              }>
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

          {/* Content Summary */}
          {knowledgeSource._count && (
            <div className="space-y-2">
              <Label>Content Summary</Label>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {knowledgeSource._count.files || 0}
                    </div>
                    <div className="text-neutral-500">Files</div>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {knowledgeSource._count.textContents || 0}
                    </div>
                    <div className="text-neutral-500">Text Content</div>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {knowledgeSource._count.websiteContents || 0}
                    </div>
                    <div className="text-neutral-500">Websites</div>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {knowledgeSource._count.qaContents || 0}
                    </div>
                    <div className="text-neutral-500">Q&A Pairs</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={saveStatus === 'saving' || !formData.name.trim() || !formData.userId}
            >
              {saveStatus === 'saving' ? 'Updating...' : 'Update Knowledge Source'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 