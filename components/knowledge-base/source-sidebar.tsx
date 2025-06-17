'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { RiAddLine, RiMoreLine, RiDeleteBinLine, RiAlertLine, RiClipboardLine, RiEdit2Line } from '@remixicon/react';
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
import { useSession } from 'next-auth/react';
import { KnowledgeSourceBadge } from './source-settings';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKnowledgeBase } from '@/app/(dashboard)/dashboard/knowledge-base/layout'; // Corrected import path

export interface Source {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  catalogMode?: string;
  userId?: string; // User ID for file uploads
  isLoading: boolean;
}

// Color combinations for source icons
// Remove colorCombinations - using simple neutral styling instead

// Get initials from source name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Type for source status information
interface SourceStatus {
  hasContent: boolean;
  isAssigned: boolean;
  isLoading: boolean;
}

export function SourceSidebar() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const { isMobileView, setShowDetailsOnMobile } = useKnowledgeBase(); // Use context
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceDescription, setNewSourceDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
  const [sourceToEdit, setSourceToEdit] = useState<Source | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSourceName, setEditSourceName] = useState('');
  const [editSourceDescription, setEditSourceDescription] = useState('');
  const { data: session } = useSession();
  const [sourceStatuses, setSourceStatuses] = useState<Record<string, SourceStatus>>({});
  const [copyTooltip, setCopyTooltip] = useState<Record<string, string>>({});

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
        
        // Initialize source statuses
        const initialStatuses: Record<string, SourceStatus> = {};
        const initialTooltips: Record<string, string> = {};
        data.forEach((source: Source) => {
          initialStatuses[source.id] = {
            hasContent: false,
            isAssigned: false,
            isLoading: true
          };
          initialTooltips[source.id] = "Copy ID";
        });
        setSourceStatuses(initialStatuses);
        setCopyTooltip(initialTooltips);
        
        // Check status for each source
        data.forEach((source: Source) => {
          checkSourceStatus(source.id);
        });
      } catch (error) {
        console.error('Error fetching sources:', error);
        toast.error('Failed to load knowledge sources');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSources();
  }, []);
  
  // Check if source has content and if it's assigned to any agent
  const checkSourceStatus = async (sourceId: string) => {
    try {
      // Set initial loading state
      setSourceStatuses(prev => ({
        ...prev,
        [sourceId]: { ...prev[sourceId], isLoading: true }
      }));
      
      // Initialize with defaults in case of errors
      let hasFiles = false;
      let hasText = false;
      let hasQA = false;
      let hasWebsite = false;
      let hasProducts = false;
      let isAssigned = false;
      
      // Check if source has content - handle each API call separately to prevent one failure from breaking all
      try {
        const filesRes = await fetch(`/api/knowledge-sources/${sourceId}/files`);
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          hasFiles = Array.isArray(filesData) && filesData.length > 0;
        }
      } catch (error) {
        console.error(`Error fetching files for source ${sourceId}:`, error);
      }
      
      try {
        const textRes = await fetch(`/api/knowledge-sources/${sourceId}/text-content`);
        if (textRes.ok) {
          const textData = await textRes.json();
          hasText = Array.isArray(textData) && textData.length > 0;
        }
      } catch (error) {
        console.error(`Error fetching text content for source ${sourceId}:`, error);
      }
      
      try {
        const qaRes = await fetch(`/api/knowledge-sources/${sourceId}/qa`);
        if (qaRes.ok) {
          const qaData = await qaRes.json();
          hasQA = Array.isArray(qaData) && qaData.length > 0;
        }
      } catch (error) {
        console.error(`Error fetching QA content for source ${sourceId}:`, error);
      }
      
      try {
        const websiteRes = await fetch(`/api/knowledge-sources/${sourceId}/websites`);
        if (websiteRes.ok) {
          const websiteData = await websiteRes.json();
          hasWebsite = Array.isArray(websiteData) && websiteData.length > 0;
        }
      } catch (error) {
        console.error(`Error fetching website content for source ${sourceId}:`, error);
      }
      
      try {
        const catalogRes = await fetch(`/api/knowledge-sources/${sourceId}/catalog`);
        if (catalogRes.ok) {
          const catalogData = await catalogRes.json();
          // Check if catalog has products
          if (catalogData && typeof catalogData === 'object') {
            if (catalogData.products && Array.isArray(catalogData.products)) {
              hasProducts = catalogData.products.length > 0;
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching catalog content for source ${sourceId}:`, error);
      }
      
      try {
        const assignedRes = await fetch(`/api/knowledge-sources/${sourceId}/assigned-agents`);
        if (assignedRes.ok) {
          const assignedData = await assignedRes.json();
          isAssigned = Array.isArray(assignedData) && assignedData.length > 0;
        }
      } catch (error) {
        console.error(`Error fetching assigned agents for source ${sourceId}:`, error);
      }
      
      // Determine if source has any content
      const hasContent = hasFiles || hasText || hasQA || hasWebsite || hasProducts;
      
      // Log status info for debugging
      console.log(`Source ${sourceId} status:`, { 
        hasContent, 
        isAssigned, 
        hasFiles,
        hasText,
        hasQA,
        hasWebsite,
        hasProducts
      });
      
      // Update the status
      setSourceStatuses(prev => ({
        ...prev,
        [sourceId]: {
          hasContent,
          isAssigned,
          isLoading: false
        }
      }));
    } catch (error) {
      console.error(`Error checking status for source ${sourceId}:`, error);
      setSourceStatuses(prev => ({
        ...prev,
        [sourceId]: {
          hasContent: false,
          isAssigned: false,
          isLoading: false
        }
      }));
    }
  };

  // Handle click on a source - navigate and potentially update mobile view
  const handleSourceClick = (sourceId: string) => {
    if (isMobileView) {
      setShowDetailsOnMobile(true); // Show details pane on mobile
    }
    router.push(`/dashboard/knowledge-base/${sourceId}`);
  };
  
  // Handle source ID copy
  const handleCopySourceId = (sourceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sourceId)
      .then(() => {
        toast.success('Source ID copied to clipboard');
        setCopyTooltip(prev => ({
          ...prev,
          [sourceId]: "Copied!"
        }));
        setTimeout(() => {
          setCopyTooltip(prev => ({
            ...prev,
            [sourceId]: "Copy ID"
          }));
        }, 2000);
      })
      .catch((err) => {
        console.error('Could not copy ID: ', err);
        toast.error('Failed to copy ID');
      });
  };

  // Handle source creation
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
      console.log('Creating knowledge source with data:', {
        name: newSourceName.trim(),
        description: newSourceDescription.trim() || undefined
      });

      const response = await fetch('/api/knowledge-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSourceName.trim(),
          description: newSourceDescription.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to create source: ${response.status}`);
      }

      setIsCreateDialogOpen(false);
      setNewSourceName('');
      setNewSourceDescription('');
      toast.success('Knowledge source created successfully');
      
      // Navigate to the new source
      router.push(`/dashboard/knowledge-base/${data.id}`);
    } catch (error) {
      console.error('Error creating source:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create knowledge source');
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

  // Handle source update
  const handleUpdateSource = async () => {
    if (!sourceToEdit) return;
    
    if (!editSourceName.trim()) {
      toast.error('Please enter a name for the source');
      return;
    }
    
    setIsEditing(true);
    
    try {
      const response = await fetch(`/api/knowledge-sources/${sourceToEdit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editSourceName.trim(),
          description: editSourceDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update source');
      }

      const updatedSource = await response.json();
      
      // Update the source in the list
      setSources(prev => prev.map(source => 
        source.id === sourceToEdit.id 
          ? { ...source, name: updatedSource.name, description: updatedSource.description } 
          : source
      ));
      
      toast.success('Knowledge source updated successfully');
      setSourceToEdit(null);
    } catch (error) {
      console.error('Error updating source:', error);
      toast.error('Failed to update knowledge source');
    } finally {
      setIsEditing(false);
    }
  };

  // Get the current source ID from the pathname
  const currentSourceId = pathname.match(/\/dashboard\/knowledge-base\/([^\/]+)/)?.[1];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
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
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-neutral-600"></div>
            <span className="ml-2 text-sm text-gray-500">Loading sources...</span>
          </div>
        ) : sources.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 mt-1">
            {sources.map((source) => (
              <div 
                key={source.id}
                onClick={() => handleSourceClick(source.id)}
                className={cn(
                  "group transition-all duration-200 cursor-pointer p-3 rounded-xl border relative",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                  "hover:shadow-sm",
                  "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
                  "hover:border-neutral-300 dark:hover:border-neutral-700",
                  currentSourceId === source.id && [
                    "border-neutral-400 dark:border-white",
                    "bg-neutral-50 dark:bg-neutral-900"
                  ]
                )}
              >
                <div className="flex items-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                    {getInitials(source.name)}
                  </span>
                  <div className="ml-3 w-full overflow-hidden">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center max-w-[70%]">
                        <div className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
                          {source.name}
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {sourceStatuses[source.id] && (
                            <KnowledgeSourceBadge 
                              hasContent={sourceStatuses[source.id].hasContent}
                              isAssigned={sourceStatuses[source.id].isAssigned}
                              isLoading={sourceStatuses[source.id].isLoading}
                              needsSaving={false}
                              compact={true}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
                      ID: {source.id.slice(0, 12)}
                    </p>
                  </div>
                </div>

                <div className="absolute right-2 top-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RiMoreLine className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-56">
                      <DropdownMenuLabel>Source Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuGroup>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSourceToEdit(source);
                            setEditSourceName(source.name);
                            setEditSourceDescription(source.description || '');
                          }}
                        >
                          <span className="flex items-center gap-x-2">
                            <DropdownMenuIconWrapper>
                              <RiEdit2Line className="size-4" />
                            </DropdownMenuIconWrapper>
                            <span>Edit</span>
                          </span>
                        </DropdownMenuItem>
                        
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

      {/* Edit Source Dialog */}
      <Dialog open={!!sourceToEdit} onOpenChange={(open) => !open && setSourceToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Knowledge Source</DialogTitle>
            <DialogDescription>
              Update the details of your knowledge source.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter source name"
                value={editSourceName}
                onChange={(e) => setEditSourceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter a description for this knowledge source"
                value={editSourceDescription}
                onChange={(e) => setEditSourceDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSourceToEdit(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSource} disabled={isEditing || !editSourceName.trim()}>
              {isEditing ? 'Saving...' : 'Save Changes'}
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
            <div className="mt-4 flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
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