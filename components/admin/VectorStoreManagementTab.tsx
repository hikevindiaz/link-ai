'use client';

import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/Input";
import { LoadingState } from '@/components/LoadingState';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/Table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RiSearchLine, RiDeleteBinLine, RiLoader2Line, RiCheckLine, RiCloseLine, RiMore2Line } from '@remixicon/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/DropdownMenu";

interface VectorDocument {
  id: string;
  knowledge_source_id: string;
  content_type: string;
  content_id: string;
  content: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface EmbeddingJob {
  job_id: string;
  knowledge_source_id: string;
  content_type: string;
  content_id: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  error_message?: string;
}

interface VectorStoreManagementTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  userFilter: string;
  setUserFilter: (user: string) => void;
}

export function VectorStoreManagementTab({ 
  searchQuery, 
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  userFilter,
  setUserFilter
}: VectorStoreManagementTabProps) {
  const [documents, setDocuments] = useState<VectorDocument[]>([]);
  const [embeddingJobs, setEmbeddingJobs] = useState<EmbeddingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<VectorDocument | null>(null);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch vector documents and embedding jobs in parallel
      const [vectorsResponse, jobsResponse] = await Promise.all([
        fetchVectorDocuments(),
        fetchEmbeddingJobs()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVectorDocuments = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      params.append('limit', '100');

      const response = await fetch(`/api/admin/vector-documents?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setDocuments(data.documents || []);
      setTotalDocs(data.totalCount || 0);
    } catch (error) {
      console.error('Error fetching vector documents:', error);
      toast.error('Failed to load vector documents');
    }
  };

  const fetchEmbeddingJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      params.append('limit', '100');

      const response = await fetch(`/api/admin/embedding-jobs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setEmbeddingJobs(data.jobs || []);
      setTotalJobs(data.totalCount || 0);
    } catch (error) {
      console.error('Error fetching embedding jobs:', error);
      // Don't show error toast here as the endpoint might not exist yet
    }
  };

  const confirmDelete = (doc: VectorDocument) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(`/api/admin/vector-documents?id=${documentToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }

      toast.success('Vector document deleted');
      setDocuments(documents.filter(d => d.id !== documentToDelete.id));
      setTotalDocs(totalDocs - 1);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400';
      case 'qa': return 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-400';
      case 'file': return 'bg-purple-100 text-purple-800 dark:bg-purple-400/10 dark:text-purple-400';
      case 'catalog': return 'bg-orange-100 text-orange-800 dark:bg-orange-400/10 dark:text-orange-400';
      case 'website': return 'bg-pink-100 text-pink-800 dark:bg-pink-400/10 dark:text-pink-400';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-400/10 dark:text-green-400';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-400/10 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-400/10 dark:text-red-400';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <RiCheckLine className="h-3 w-3" />;
      case 'processing': return <RiLoader2Line className="h-3 w-3 animate-spin" />;
      case 'pending': return <RiLoader2Line className="h-3 w-3" />;
      case 'failed': return <RiCloseLine className="h-3 w-3" />;
      default: return null;
    }
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const renderLoadingSkeleton = (skeletonCount: number) => (
    <div className="mt-3 space-y-2">
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );

  const renderVectorTable = () => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Type
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Content
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Knowledge Source
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Model
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
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                {searchQuery 
                  ? 'No documents match your search criteria' 
                  : 'Vector documents will appear here when users add content to knowledge sources'}
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => (
              <TableRow
                key={doc.id}
                className="hover:bg-neutral-50 hover:dark:bg-neutral-900"
              >
                <TableCell>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getContentTypeColor(doc.content_type)}`}>
                    {doc.content_type}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200 max-w-xs">
                  <div className="truncate">{truncateContent(doc.content)}</div>
                </TableCell>
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  <span className="font-mono">{doc.knowledge_source_id.substring(0, 8)}...</span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300">
                    {doc.metadata?.model || 'gte-small'}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                  {new Date(doc.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
                          <RiMore2Line className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => confirmDelete(doc)}
                          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                        >
                          <RiDeleteBinLine className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableRoot>
  );

  const renderJobsTable = () => (
    <TableRoot className="mt-3">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Status
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Type
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Content
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Knowledge Source
            </TableHeaderCell>
            <TableHeaderCell className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Created
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {embeddingJobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                Embedding jobs will appear here when content is being processed
              </TableCell>
            </TableRow>
          ) : (
            embeddingJobs.map((job) => (
              <TableRow
                key={job.job_id}
                className="hover:bg-neutral-50 hover:dark:bg-neutral-900"
              >
                <TableCell>
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${getStatusColor(job.status)}`}>
                    {getStatusIcon(job.status)}
                    {job.status}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getContentTypeColor(job.content_type)}`}>
                    {job.content_type}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200 max-w-xs">
                  <div className="truncate">{truncateContent(job.content)}</div>
                  {job.error_message && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Error: {job.error_message}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm text-neutral-700 dark:text-neutral-200">
                  <span className="font-mono">{job.knowledge_source_id.substring(0, 8)}...</span>
                </TableCell>
                <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                  {new Date(job.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableRoot>
  );

  return (
    <div className="px-4 md:px-8 pt-6">
      <h1 className="text-lg font-regular text-neutral-700 dark:text-neutral-200">
        Vector Store Management
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        View and manage all vector embeddings across the platform.
        </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-8">
        <Card className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Vectors</p>
          <p className="text-2xl font-bold">{totalDocs.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Processing Jobs</p>
          <p className="text-2xl font-bold">{embeddingJobs.filter(j => j.status === 'processing' || j.status === 'pending').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Failed Jobs</p>
          <p className="text-2xl font-bold">{embeddingJobs.filter(j => j.status === 'failed').length}</p>
        </Card>
      </div>

      <Tabs defaultValue="vectors" className="mt-8">
        <TabsList variant="line">
          <TabsTrigger value="vectors">
            Processed Vectors ({totalDocs})
          </TabsTrigger>
          <TabsTrigger value="jobs">
            Embedding Jobs ({totalJobs})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vectors">
          <div className="mt-4 sm:flex sm:items-center sm:space-x-2">
            <Input 
              placeholder="Search vectors..." 
              type="search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isLoading ? renderLoadingSkeleton(5) : renderVectorTable()}
        </TabsContent>

        <TabsContent value="jobs">
          <div className="mt-4 sm:flex sm:items-center sm:space-x-2">
            <Input
              placeholder="Search jobs..." 
              type="search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isLoading ? renderLoadingSkeleton(5) : renderJobsTable()}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vector Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this vector document? This will remove the embedding but won't affect the original content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 