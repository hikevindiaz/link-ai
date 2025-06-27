'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "@/components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/Table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/DropdownMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/Button";
import { toast } from "sonner";
import { 
  IconDots,
  IconEdit,
  IconTrash,
  IconEye,
  IconCopy,
  IconUsers,
  IconFile,
  IconWorld,
  IconQuestionMark,
  IconPlus,
  IconRefresh
} from "@tabler/icons-react";
import { CreateKnowledgeSourceDialog } from "./CreateKnowledgeSourceDialog";
import { EditKnowledgeSourceDialog } from "./EditKnowledgeSourceDialog";
import { AssignKnowledgeSourceDialog } from "./AssignKnowledgeSourceDialog";

interface KnowledgeSourcesManagementTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  userFilter: string;
  setUserFilter: (user: string) => void;
}

interface KnowledgeSource {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  user: {
    name: string | null;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  vectorStoreId: string | null;
  catalogMode: string | null;
  _count: {
    files: number;
    textContents: number;
    websiteContents: number;
    qaContents: number;
    chatbots: number;
  };
  chatbots: Array<{
    id: string;
    name: string;
  }>;
}

const contentTypeOptions = [
  { label: 'All Types', value: 'all' },
  { label: 'Files', value: 'files' },
  { label: 'Text Content', value: 'text' },
  { label: 'Websites', value: 'websites' },
  { label: 'Q&A', value: 'qa' },
  { label: 'Catalog', value: 'catalog' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Unassigned', value: 'unassigned' },
];

export function KnowledgeSourcesManagementTab({ 
  searchQuery, 
  setSearchQuery, 
  statusFilter, 
  setStatusFilter,
  userFilter,
  setUserFilter
}: KnowledgeSourcesManagementTabProps) {
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<KnowledgeSource | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Ensure filter values are never empty strings
  const safeStatusFilter = statusFilter || 'all';
  const safeUserFilter = userFilter || 'all';

  // Fetch knowledge sources
  const fetchKnowledgeSources = async () => {
    try {
      const response = await fetch('/api/admin/knowledge-sources');
      if (response.ok) {
        const data = await response.json();
        setKnowledgeSources(data.knowledgeSources || []);
      }
    } catch (error) {
      console.error('Error fetching knowledge sources:', error);
    } finally {
      setSourcesLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeSources();
  }, []);

  // Fetch users for filter
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

    fetchUsers();
  }, []);

  // Handle knowledge source deletion
  const handleDeleteSource = async (sourceId: string) => {
    setDeletingSourceId(sourceId);
    
    try {
      const response = await fetch(`/api/admin/knowledge-sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setKnowledgeSources(knowledgeSources.filter(source => source.id !== sourceId));
        toast.success('Knowledge source deleted successfully');
      } else {
        const error = await response.json();
        toast.error('Failed to delete knowledge source');
        console.error('Failed to delete knowledge source:', error);
      }
    } catch (error) {
      toast.error('Failed to delete knowledge source');
      console.error('Error deleting knowledge source:', error);
    } finally {
      setDeletingSourceId(null);
    }
  };

  // Handle copy source ID
  const handleCopySourceId = (sourceId: string) => {
    navigator.clipboard.writeText(sourceId);
    toast.success('Knowledge source ID copied to clipboard');
  };

  // Handle edit source
  const handleEditSource = (source: KnowledgeSource) => {
    setSelectedSource(source);
    setEditDialogOpen(true);
  };

  // Handle assign source
  const handleAssignSource = (source: KnowledgeSource) => {
    setSelectedSource(source);
    setAssignDialogOpen(true);
  };

  // Handle source updated
  const handleSourceUpdated = () => {
    fetchKnowledgeSources(); // Refresh the list
  };

  // Get content types badges
  const getContentTypesBadges = (source: KnowledgeSource) => {
    const badges = [];
    
    if (source._count.files > 0) {
      badges.push(
        <Badge key="files" variant="secondary" className="text-xs">
          <IconFile className="h-3 w-3 mr-1" />
          {source._count.files} Files
        </Badge>
      );
    }
    
    if (source._count.textContents > 0) {
      badges.push(
        <Badge key="text" variant="secondary" className="text-xs">
          {source._count.textContents} Text
        </Badge>
      );
    }
    
    if (source._count.websiteContents > 0) {
      badges.push(
        <Badge key="websites" variant="secondary" className="text-xs">
          <IconWorld className="h-3 w-3 mr-1" />
          {source._count.websiteContents} Sites
        </Badge>
      );
    }
    
    if (source._count.qaContents > 0) {
      badges.push(
        <Badge key="qa" variant="secondary" className="text-xs">
          <IconQuestionMark className="h-3 w-3 mr-1" />
          {source._count.qaContents} Q&A
        </Badge>
      );
    }

    if (source.catalogMode) {
      badges.push(
        <Badge key="catalog" variant="secondary" className="text-xs">
          Catalog
        </Badge>
      );
    }

    return badges;
  };

  // Filter knowledge sources based on search and filters
  const filteredSources = knowledgeSources.filter(source => {
    const matchesSearch = searchQuery === '' || 
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (source.user.name && source.user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Use statusFilter as content type filter
    const matchesType = safeStatusFilter === 'all' || (() => {
      switch (safeStatusFilter) {
        case 'files':
          return source._count.files > 0;
        case 'text':
          return source._count.textContents > 0;
        case 'websites':
          return source._count.websiteContents > 0;
        case 'qa':
          return source._count.qaContents > 0;
        case 'catalog':
          return source.catalogMode !== null;
        case 'assigned':
          return source._count.chatbots > 0;
        case 'unassigned':
          return source._count.chatbots === 0;
        default:
          return true;
      }
    })();
    
    const matchesUser = safeUserFilter === 'all' || source.userId === safeUserFilter;
    
    return matchesSearch && matchesType && matchesUser;
  });

  const renderKnowledgeSourcesTable = () => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Knowledge Source
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Owner
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Content Types
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Agents
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Created
            </TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredSources.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No knowledge sources found
              </TableCell>
            </TableRow>
          ) : (
            filteredSources.map((source) => (
              <TableRow key={source.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-normal text-neutral-700 dark:text-neutral-200">
                      {source.name}
                    </div>
                    {source.description && (
                      <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                        {source.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-normal text-neutral-700 dark:text-neutral-200">
                      {source.user.name || 'Unnamed User'}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      {source.user.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getContentTypesBadges(source)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <IconUsers className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    <span className="text-sm font-normal text-neutral-700 dark:text-neutral-200">
                      {source._count.chatbots}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    {new Date(source.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                        <IconDots className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => handleCopySourceId(source.id)}
                        className="flex items-center gap-2"
                      >
                        <IconCopy className="h-4 w-4" />
                        Copy ID
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEditSource(source)}
                        className="flex items-center gap-2"
                      >
                        <IconEdit className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAssignSource(source)}
                        className="flex items-center gap-2"
                      >
                        <IconUsers className="h-4 w-4" />
                        Assign to Agents
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteSource(source.id)}
                        className="flex items-center gap-2 text-red-600 dark:text-red-400"
                        disabled={deletingSourceId === source.id}
                      >
                        <IconTrash className="h-4 w-4" />
                        {deletingSourceId === source.id ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableRoot>
  );

  const renderLoadingSkeleton = (skeletonCount: number) => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Knowledge Source
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Owner
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Content Types
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Agents
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Created
            </TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-6 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableRoot>
  );

  return (
    <div className="px-4 md:px-8 pt-6">
      <h1 className="text-xl font-normal text-neutral-700 dark:text-neutral-200">
        Knowledge Sources Management
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Manage knowledge sources and their assignments to agents
      </p>
      
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
            All Knowledge Sources ({filteredSources.length})
          </h2>
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <IconPlus className="h-4 w-4 mr-2" />
            Create Knowledge Source
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 sm:flex sm:items-center sm:space-x-2">
          <Input 
            placeholder="Search knowledge sources..." 
            type="search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={safeStatusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="mt-2 sm:mt-0 sm:w-40">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              {contentTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={safeUserFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="mt-2 sm:mt-0 sm:w-48">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {sourcesLoading ? renderLoadingSkeleton(5) : renderKnowledgeSourcesTable()}
      </div>

      {/* Dialogs */}
      <CreateKnowledgeSourceDialog
        open={createDialogOpen}
        setOpen={setCreateDialogOpen}
        onKnowledgeSourceCreated={handleSourceUpdated}
      />

      {selectedSource && (
        <>
          <EditKnowledgeSourceDialog
            open={editDialogOpen}
            setOpen={setEditDialogOpen}
            knowledgeSource={selectedSource}
            onKnowledgeSourceUpdated={handleSourceUpdated}
          />

          <AssignKnowledgeSourceDialog
            open={assignDialogOpen}
            setOpen={setAssignDialogOpen}
            knowledgeSource={selectedSource}
            onAssignmentUpdated={handleSourceUpdated}
          />
        </>
      )}
    </div>
  );
} 