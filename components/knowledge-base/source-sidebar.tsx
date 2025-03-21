'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { RiAddLine, RiMoreLine, RiDeleteBinLine, RiAlertLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuIconWrapper,
  DropdownMenuTrigger 
} from '@/components/DropdownMenu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/Divider";

export interface Source {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  catalogMode?: string;
}

// Color combinations for source icons
const colorCombinations = [
  { text: 'text-fuchsia-800 dark:text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-500/20' },
  { text: 'text-indigo-800 dark:text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
  { text: 'text-pink-800 dark:text-pink-500', bg: 'bg-pink-100 dark:bg-pink-500/20' },
  { text: 'text-emerald-800 dark:text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
  { text: 'text-orange-800 dark:text-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/20' },
  { text: 'text-indigo-800 dark:text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
  { text: 'text-yellow-800 dark:text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-500/20' },
];

// Get initials from source name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function SourceSidebar() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceDescription, setNewSourceDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch sources from the API
  useEffect(() => {
    const fetchSources = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/knowledge-sources');
        if (!response.ok) {
          throw new Error('Failed to fetch sources');
        }
        const data = await response.json();
        setSources(data);
      } catch (error) {
        console.error('Error fetching sources:', error);
        toast.error('Failed to load knowledge sources');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSources();
  }, []);

  // Handle source selection
  const handleSourceClick = (sourceId: string) => {
    router.push(`/dashboard/knowledge-base/${sourceId}`);
  };

  // Handle source creation
  const handleCreateSource = async () => {
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create source');
      }

      const newSource = await response.json();
      
      // Add the new source to the list
      setSources(prev => [...prev, newSource]);
      
      // Reset form
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

  // Handle source deletion
  const handleDeleteSource = async () => {
    if (!sourceToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/knowledge-sources/${sourceToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete source');
      }

      // Remove the source from the list
      setSources(prev => prev.filter(source => source.id !== sourceToDelete.id));
      
      toast.success('Knowledge source deleted successfully');
      
      // Navigate to the knowledge base home if the current source was deleted
      if (pathname.includes(sourceToDelete.id)) {
        router.push('/dashboard/knowledge-base');
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      toast.error('Failed to delete knowledge source');
    } finally {
      setIsDeleting(false);
      setSourceToDelete(null);
    }
  };

  // Get the current source ID from the pathname
  const currentSourceId = pathname.match(/\/dashboard\/knowledge-base\/([^\/]+)/)?.[1];

  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            My Sources
          </h2>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <RiAddLine className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Divider className="mt-4" />
      
      <div className="flex-1 overflow-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
            <span className="ml-2 text-sm text-gray-500">Loading sources...</span>
          </div>
        ) : sources.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 mt-1">
            {sources.map((source, index) => (
              <Card 
                key={source.id}
                className={cn(
                  "group transition-all duration-200",
                  "hover:bg-gray-50 dark:hover:bg-gray-900",
                  "hover:shadow-sm",
                  "hover:border-gray-300 dark:hover:border-gray-700",
                  currentSourceId === source.id && [
                    "border-indigo-500 dark:border-indigo-500",
                    "bg-indigo-50/50 dark:bg-indigo-500/5",
                    "ring-1 ring-indigo-500/20 dark:ring-indigo-500/20"
                  ]
                )}
              >
                <div className="relative px-3.5 py-2.5">
                  <div className="flex items-center space-x-3">
                    <span
                      className={cn(
                        colorCombinations[index % colorCombinations.length].bg,
                        colorCombinations[index % colorCombinations.length].text,
                        'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                        'transition-transform duration-200 group-hover:scale-[1.02]',
                        currentSourceId === source.id && [
                          "border-2 border-indigo-500 dark:border-indigo-500",
                          "shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                        ]
                      )}
                      aria-hidden={true}
                    >
                      {getInitials(source.name)}
                    </span>
                    <div className="truncate min-w-0">
                      <p className={cn(
                        "truncate text-sm font-medium text-gray-900 dark:text-gray-50",
                        currentSourceId === source.id && "text-indigo-600 dark:text-indigo-400"
                      )}>
                        <button 
                          onClick={() => handleSourceClick(source.id)}
                          className="focus:outline-none hover:no-underline no-underline"
                          type="button"
                        >
                          <span className="absolute inset-0" aria-hidden="true" />
                          {source.name}
                        </button>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 pointer-events-none no-underline mt-0.5">
                        ID: {source.id.slice(0, 12)}
                      </p>
                    </div>
                  </div>

                  <div className="absolute right-2.5 top-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RiMoreLine className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="min-w-56">
                        <DropdownMenuLabel>Source Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuGroup>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSourceToDelete(source);
                            }}
                            className="text-red-600 dark:text-red-400"
                          >
                            <span className="flex items-center gap-x-2">
                              <DropdownMenuIconWrapper>
                                <RiDeleteBinLine className="size-4 text-inherit" />
                              </DropdownMenuIconWrapper>
                              <span>Delete</span>
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center py-8 text-center">
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No knowledge sources yet.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <RiAddLine className="mr-2 h-4 w-4" />
                Create New Source
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Source Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Knowledge Source</DialogTitle>
            <DialogDescription>
              Add a new knowledge source to enhance your Agent's capabilities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sidebar-name">Name</Label>
              <Input
                id="sidebar-name"
                placeholder="Enter source name"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sidebar-description">Description (optional)</Label>
              <Textarea
                id="sidebar-description"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!sourceToDelete} onOpenChange={(open) => !open && setSourceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Knowledge Source</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this knowledge source? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {sourceToDelete && (
            <div className="mt-4 flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                  'bg-red-100 dark:bg-red-500/20',
                  'text-red-800 dark:text-red-500'
                )}
              >
                <RiAlertLine className="size-5" />
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-50">{sourceToDelete.name}</p>
                {sourceToDelete.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {sourceToDelete.description}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button
                variant="secondary"
                className="mt-2 w-full sm:mt-0 sm:w-fit"
                onClick={() => setSourceToDelete(null)}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button 
              variant="destructive"
              className="w-full sm:w-fit"
              onClick={handleDeleteSource}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 