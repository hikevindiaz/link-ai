'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { RiAddLine, RiDatabase2Line, RiAlertLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
        
        const sources = await response.json();
        setHasExistingSources(sources.length > 0);
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
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
          <RiDatabase2Line className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          {hasExistingSources 
            ? 'Select a Knowledge Source' 
            : 'Welcome to Knowledge Base'}
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {hasExistingSources 
            ? 'Select a knowledge source from the sidebar or create a new one to get started.' 
            : 'Create your first knowledge source to enhance your Agent with custom data.'}
        </p>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-6" onClick={() => setIsCreateDialogOpen(true)}>
              <RiAddLine className="mr-2 h-4 w-4" />
              Create Knowledge Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Knowledge Source</DialogTitle>
              <DialogDescription>
                Add a new knowledge source to enhance your Agent's capabilities.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter source name"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a description for this knowledge source"
                  value={newSourceDescription}
                  onChange={(e) => setNewSourceDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSource} disabled={isCreating || !newSourceName.trim()}>
                {isCreating ? 'Creating...' : 'Create Source'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
