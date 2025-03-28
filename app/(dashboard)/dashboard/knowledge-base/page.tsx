'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { RiAddLine, RiDatabase2Line, RiAlertLine, RiArrowUpCircleLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProgressDialog } from '@/components/ui/progress-dialog';
import { useKnowledgeBase } from './layout';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceDescription, setNewSourceDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [hasExistingSources, setHasExistingSources] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState(false);
  const { isDirty, isSaving, pendingChanges, saveAllChanges, resetPendingChanges } = useKnowledgeBase();
  
  // Migration state
  const [sources, setSources] = useState<any[]>([]);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [migrationMessages, setMigrationMessages] = useState<{type: 'info' | 'success' | 'error', content: string}[]>([]);

  useEffect(() => {
    const checkForSources = async () => {
      if (!session?.user?.id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/knowledge-sources?userId=${session.user.id}`);
        
        if (response.status === 500) {
          const errorText = await response.text();
          if (errorText.includes('Database tables not created') || errorText.includes('does not exist')) {
            setDatabaseError(true);
            return;
          }
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch sources');
        }
        
        const data = await response.json();
        setSources(data);
        setHasExistingSources(data.length > 0);
      } catch (error) {
        console.error('Error checking for sources:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkForSources();
  }, [session?.user?.id]);

  const handleCreateSource = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to create a knowledge source');
      return;
    }

    if (!newSourceName.trim()) {
      toast.error('Please enter a name for the source');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/knowledge-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSourceName.trim(),
          description: newSourceDescription.trim() || undefined,
          userId: session.user.id,
        }),
      });

      if (response.status === 500) {
        const errorText = await response.text();
        if (errorText.includes('Database tables not created') || errorText.includes('does not exist')) {
          setDatabaseError(true);
          setIsCreateDialogOpen(false);
          return;
        }
      }

      if (!response.ok) {
        throw new Error('Failed to create source');
      }

      const newSource = await response.json();
      setIsCreateDialogOpen(false);
      setNewSourceName('');
      setNewSourceDescription('');
      toast.success('Knowledge source created successfully');
      
      // Navigate to the new source
      router.push(`/dashboard/knowledge-base/${newSource.id}`);
    } catch (error) {
      console.error('Error creating source:', error);
      toast.error('Failed to create knowledge source');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTrainAgents = async () => {
    if (sources.length === 0) {
      toast.error('No knowledge sources to train agents with');
      return;
    }

    // Reset migration state
    setMigrationStatus('processing');
    setMigrationProgress(0);
    setMigrationMessages([
      { type: 'info', content: 'Starting to train your agents with knowledge sources...' }
    ]);
    setShowMigrationDialog(true);

    let completedCount = 0;
    let errorCount = 0;
    
    // Process each source sequentially
    for (const source of sources) {
      try {
        // Check if this source already has a vector store
        setMigrationMessages(prev => [
          ...prev, 
          { type: 'info', content: `Preparing knowledge from: ${source.name}` }
        ]);
        
        // Attempt to migrate this source
        const response = await fetch('/api/knowledge-sources/migrate-to-vector', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            knowledgeSourceId: source.id,
          }),
        });

        if (response.ok) {
          completedCount++;
          
          setMigrationMessages(prev => [
            ...prev, 
            { 
              type: 'success', 
              content: `Successfully trained agents with "${source.name}"` 
            }
          ]);
        } else {
          const errorData = await response.json();
          errorCount++;
          
          setMigrationMessages(prev => [
            ...prev, 
            { 
              type: 'error', 
              content: `Failed to train with "${source.name}": ${errorData.error || 'Unknown error'}` 
            }
          ]);
        }
        
        // Update progress
        const progress = Math.round(((completedCount + errorCount) / sources.length) * 100);
        setMigrationProgress(progress);
        
      } catch (error) {
        errorCount++;
        setMigrationMessages(prev => [
          ...prev, 
          { 
            type: 'error', 
            content: `Error processing "${source.name}": ${error instanceof Error ? error.message : 'Unknown error'}` 
          }
        ]);
        
        // Update progress
        const progress = Math.round(((completedCount + errorCount) / sources.length) * 100);
        setMigrationProgress(progress);
      }
    }

    // Finalize migration
    if (errorCount === 0) {
      setMigrationStatus('completed');
      setMigrationMessages(prev => [
        ...prev, 
        { 
          type: 'success', 
          content: `Training completed successfully! Your agents can now access ${completedCount} knowledge sources.` 
        }
      ]);
    } else {
      setMigrationStatus('error');
      setMigrationMessages(prev => [
        ...prev, 
        { 
          type: 'error', 
          content: `Training completed with some issues. ${completedCount} successful, ${errorCount} failed.` 
        }
      ]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (databaseError) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="mx-auto max-w-md">
          <Alert variant="destructive" className="mb-6">
            <RiAlertLine className="h-4 w-4" />
            <AlertTitle>Database Setup Required</AlertTitle>
            <AlertDescription>
              The database tables for knowledge sources have not been created yet. Please run the following commands in your terminal:
            </AlertDescription>
          </Alert>
          
          <div className="rounded-md bg-gray-900 p-4 text-white">
            <pre className="overflow-x-auto text-sm">
              <code>
                npx prisma generate{'\n'}
                npx prisma db push
              </code>
            </pre>
          </div>
          
          <p className="mt-4 text-sm text-gray-500">
            After running these commands, restart your development server and refresh this page.
          </p>
          
          <Button 
            className="mt-6 w-full" 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 relative">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
          <RiDatabase2Line className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Knowledge Base</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Add knowledge to make your AI assistants smarter.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="inline-flex items-center"
          >
            <RiAddLine className="mr-1 h-4 w-4" />
            Create New Source
          </Button>
          
          {hasExistingSources && (
            <Button 
              variant="secondary"
              onClick={handleTrainAgents}
              className="inline-flex items-center"
            >
              <RiArrowUpCircleLine className="mr-1 h-4 w-4" />
              Train Agents
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress Dialog for training */}
      <ProgressDialog
        title="Training Agents"
        description="Your agents are learning from your knowledge sources"
        open={showMigrationDialog}
        onOpenChange={(open) => {
          if (!open && migrationStatus !== 'processing') {
            setShowMigrationDialog(false);
          }
        }}
        progress={migrationProgress}
        status={migrationStatus}
        messages={migrationMessages}
        allowClose={migrationStatus !== 'processing'}
      />

      {/* Create source dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Knowledge Source</DialogTitle>
            <DialogDescription>
              Create a new knowledge source to power your AI assistants.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="e.g. Product Documentation"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newSourceDescription}
                onChange={(e) => setNewSourceDescription(e.target.value)}
                placeholder="Brief description of this knowledge source"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSource}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
