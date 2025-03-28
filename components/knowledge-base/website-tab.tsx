'use client';

import { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, Loader2, AlertCircle, CheckCircle2, Bug } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Source } from './source-sidebar';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Divider } from "@/components/Divider";
import { ProgressBar } from "@/components/ProgressBar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { LoadingState } from '@/components/LoadingState';
import { RiAddLine, RiDeleteBinLine, RiInformationLine, RiGlobalLine, RiSearchLine } from '@remixicon/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useKnowledgeBase } from '@/app/(dashboard)/dashboard/knowledge-base/layout';

interface WebsiteTabProps {
  source?: Source;
  onSave: (data: any) => Promise<void>;
}

interface WebsiteContent {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  knowledgeSourceId: string;
}

interface CrawlerFile {
  id: string;
  name: string;
  createdAt: string;
  blobUrl?: string;
  crawlerId?: string; // To identify crawler-generated files
}

interface PendingWebsiteAction {
  type: 'add' | 'delete';
  url?: string;
  websiteId?: string;
}

export function WebsiteTab({ source, onSave }: WebsiteTabProps) {
  // Live Web Searches state
  const [liveSearchUrl, setLiveSearchUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWebsites, setSavedWebsites] = useState<WebsiteContent[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteWebsiteDialogOpen, setDeleteWebsiteDialogOpen] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<WebsiteContent | null>(null);
  const [isDeletingWebsite, setIsDeletingWebsite] = useState(false);
  
  // Crawler state
  const [crawlerUrl, setCrawlerUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlerFiles, setCrawlerFiles] = useState<CrawlerFile[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<CrawlerFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [crawlingProgress, setCrawlingProgress] = useState(0);
  const [crawlingStatus, setCrawlingStatus] = useState('');
  
  // Global save state
  const { addPendingChange } = useKnowledgeBase();
  
  // Fetch existing websites and crawler files when component mounts or source changes
  useEffect(() => {
    if (source?.id) {
      fetchWebsites();
      fetchCrawlerFiles();
    }
  }, [source?.id]);

  // Simulate crawling progress when isCrawling is true
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCrawling) {
      setCrawlingProgress(0);
      setCrawlingStatus('Initializing crawler...');
      
      // Simulate progress updates
      interval = setInterval(() => {
        setCrawlingProgress(prev => {
          // Update status message based on progress
          if (prev < 20) {
            setCrawlingStatus('Initializing crawler...');
          } else if (prev < 40) {
            setCrawlingStatus('Scanning website structure...');
          } else if (prev < 60) {
            setCrawlingStatus('Extracting content...');
          } else if (prev < 80) {
            setCrawlingStatus('Processing extracted content...');
          } else {
            setCrawlingStatus('Finalizing and saving content...');
          }
          
          // Increment progress, but don't reach 100% until we're done
          return prev < 90 ? prev + 5 : prev;
        });
      }, 800);
    } else if (crawlingProgress > 0 && crawlingProgress < 100) {
      // When crawling is complete, set to 100%
      setCrawlingProgress(100);
      setCrawlingStatus('Crawling complete!');
      
      // Reset after a delay
      setTimeout(() => {
        setCrawlingProgress(0);
        setCrawlingStatus('');
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCrawling, crawlingProgress]);

  const fetchWebsites = async () => {
    if (!source?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching websites for source: ${source.id}`);
      
      // Use the dedicated website API endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/website`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch websites: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched websites:', data);
      
      // Set the websites directly from the API response
      setSavedWebsites(data);
    } catch (error) {
      console.error('Error fetching website content:', error);
      setError('Failed to load existing website content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCrawlerFiles = async () => {
    if (!source?.id) return;
    
    try {
      // First try to fetch files with crawler-file type
      let response = await fetch(`/api/knowledge-sources/${source.id}/content?type=file`);
      
      if (!response.ok) {
        console.error('Error fetching files:', response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('Fetched files:', data);
      
      // Filter files that are likely from crawlers
      const crawlerFilesList = data.filter((file: CrawlerFile) => 
        file.crawlerId || 
        (file.name && (
          file.name.toLowerCase().includes('crawl') || 
          file.name.toLowerCase().includes('web') ||
          file.name.toLowerCase().includes('site')
        ))
      );
      
      setCrawlerFiles(crawlerFilesList);
    } catch (error) {
      console.error('Error fetching crawler files:', error);
    }
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleAddLiveSearchUrl = () => {
    if (!source?.id) return;

    // Validate URL
    if (!liveSearchUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    // Add https:// if the URL doesn't have a protocol
    let formattedUrl = liveSearchUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    if (!validateUrl(formattedUrl)) {
      toast.error("Please enter a valid URL");
      return;
    }

    // Add this URL to the pending changes
    const pendingAction: PendingWebsiteAction = {
      type: 'add',
      url: formattedUrl
    };

    // Add to global pending changes
    addPendingChange(source.id, {
      website: pendingAction
    });
    
    // Add to local state for immediate UI update
    const tempWebsite: WebsiteContent = {
      id: `temp-${Date.now()}`,
      url: formattedUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      knowledgeSourceId: source.id
    };
    
    setSavedWebsites(prev => [...prev, tempWebsite]);
    setLiveSearchUrl(''); // Reset the input field
    
    // Show success message
    toast.success("URL added to changes");
  };

  const confirmDeleteWebsite = (website: WebsiteContent) => {
    setWebsiteToDelete(website);
    setDeleteWebsiteDialogOpen(true);
  };

  const handleDeleteWebsite = () => {
    if (!websiteToDelete || !source?.id) return;
    
    // Add delete action to pending changes
    const pendingAction: PendingWebsiteAction = {
      type: 'delete',
      websiteId: websiteToDelete.id
    };
    
    // Add to global pending changes
    addPendingChange(source.id, {
      website: pendingAction
    });
    
    // Update UI by removing from local state
    setSavedWebsites(prev => prev.filter(website => website.id !== websiteToDelete.id));
    
    // Close dialog and reset state
    setDeleteWebsiteDialogOpen(false);
    setWebsiteToDelete(null);
    
    // Show success message
    toast.success("Website removal queued for saving");
  };

  const handleStartCrawl = async () => {
    if (!source?.id) return;

    // Validate URL
    if (!crawlerUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    // Add https:// if the URL doesn't have a protocol
    let formattedUrl = crawlerUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    if (!validateUrl(formattedUrl)) {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsCrawling(true);

    try {
      // Extract hostname for the URL match pattern
      let hostname = '';
      try {
        hostname = new URL(formattedUrl).hostname;
      } catch (e) {
        console.error('Error parsing URL:', e);
        hostname = formattedUrl.replace(/^https?:\/\//, '').split('/')[0];
      }
      
      // Create a crawler request with default values for other fields
      const crawlerData = {
        sourceId: source.id,
        crawlUrl: formattedUrl,
        selector: 'body', // Default selector
        urlMatch: hostname, // Default to the hostname
        maxPagesToCrawl: 10 // Default max pages
      };
      
      console.log('Sending crawler request:', crawlerData);
      
      const response = await fetch(`/api/knowledge-sources/${source.id}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(crawlerData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Crawler API response (${response.status}):`, errorText);
        throw new Error(`Failed to start crawler: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Crawler started:', data);
      
      // Refresh the file list after a short delay
      setTimeout(async () => {
        await fetchCrawlerFiles();
        
        // Show success message
        setSuccessMessage(data.message || "Crawler started successfully. The crawled content will appear in the files section when complete.");
        setSuccessDialogOpen(true);
        toast.success("Crawler completed successfully");
        
        // Reset form fields
        setCrawlerUrl('');
      }, 5000);
    } catch (error) {
      console.error('Error starting crawler:', error);
      toast.error(error instanceof Error ? error.message : "Failed to start crawler");
    } finally {
      setIsCrawling(false);
    }
  };

  const confirmDeleteFile = (file: CrawlerFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete || !source?.id) return;

    setIsDeleting(true);

    try {
      // Make API call to delete file
      const response = await fetch(`/api/knowledge-sources/${source.id}/content/${fileToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }

      // Update UI by removing deleted file
      setCrawlerFiles(prev => prev.filter(file => file.id !== fileToDelete.id));
      
      // Show success message
      toast.success("File deleted successfully");
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error("Failed to delete file. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Render content
  return (
    <div className="space-y-6">
      <Tabs defaultValue="liveSearch" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="liveSearch" className="flex items-center gap-2">
            <RiSearchLine className="h-4 w-4" />
            Live Search URLs
          </TabsTrigger>
          <TabsTrigger value="crawler" className="flex items-center gap-2">
            <RiGlobalLine className="h-4 w-4" />
            Crawled Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liveSearch" className="space-y-4 pt-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="websiteUrl">Add URL for Live Search</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400">
                          <RiInformationLine className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-80">
                        <p>URLs added here will be used for live web search during chat. The content is not indexed or stored in your knowledge base. Each search will fetch content in real-time.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex space-x-2">
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    placeholder="https://example.com"
                    value={liveSearchUrl}
                    onChange={(e) => setLiveSearchUrl(e.target.value)}
                    disabled={isSubmitting}
                    className="flex-1"
                  />
                  <Button onClick={handleAddLiveSearchUrl} disabled={isSubmitting} className="whitespace-nowrap">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <RiAddLine className="mr-1 h-4 w-4" />
                        Add URL
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Saved URLs for Live Search</h3>
                {isLoading ? (
                  <LoadingState />
                ) : savedWebsites.length > 0 ? (
                  <Table>
                    <TableCaption>URLs available for live search</TableCaption>
                    <TableHead>
                      <TableRow>
                        <TableCell className="w-full">URL</TableCell>
                        <TableCell className="whitespace-nowrap">Added On</TableCell>
                        <TableCell className="w-[100px]">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {savedWebsites.map((website) => (
                        <TableRow key={website.id}>
                          <TableCell className="font-medium break-all">{website.url}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(website.createdAt)}</TableCell>
                          <TableCell>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => confirmDeleteWebsite(website)}
                              className="flex items-center gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                              <span>Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center p-4 border rounded-md border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No URLs added yet</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="crawler" className="space-y-4 pt-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="crawlerUrl">Crawl Website</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400">
                          <RiInformationLine className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-80">
                        <p>This feature will crawl the website and save its content to your knowledge base. The content will be processed and stored for later use in chats.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex space-x-2">
                  <Input
                    id="crawlerUrl"
                    name="crawlerUrl"
                    placeholder="https://example.com"
                    value={crawlerUrl}
                    onChange={(e) => setCrawlerUrl(e.target.value)}
                    disabled={isCrawling}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleStartCrawl} 
                    disabled={isCrawling}
                    className="whitespace-nowrap"
                  >
                    {isCrawling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Crawling...
                      </>
                    ) : (
                      <>
                        <Globe className="mr-1 h-4 w-4" />
                        Crawl Site
                      </>
                    )}
                  </Button>
                </div>
                
                {crawlingProgress > 0 && (
                  <div className="mt-4">
                    <ProgressBar value={crawlingProgress} />
                    <p className="text-sm text-gray-500 mt-2">{crawlingStatus}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Crawled Website Files</h3>
                {isLoading ? (
                  <LoadingState />
                ) : crawlerFiles.length > 0 ? (
                  <Table>
                    <TableCaption>Files created from website crawls</TableCaption>
                    <TableHead>
                      <TableRow>
                        <TableCell className="w-full">File Name</TableCell>
                        <TableCell className="whitespace-nowrap">Created On</TableCell>
                        <TableCell className="w-[100px]">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {crawlerFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium break-all">{file.name}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(file.createdAt)}</TableCell>
                          <TableCell>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => confirmDeleteFile(file)}
                              className="flex items-center gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                              <span>Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center p-4 border rounded-md border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No crawled website files</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete website confirmation dialog */}
      <Dialog open={deleteWebsiteDialogOpen} onOpenChange={setDeleteWebsiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Website</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this website? This will remove it from your knowledge source.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden text-ellipsis">
            {websiteToDelete?.url}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteWebsiteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteWebsite} disabled={isDeletingWebsite}>
              {isDeletingWebsite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete file confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden text-ellipsis">
            {fileToDelete?.name}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteFile} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Success dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Success
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{successMessage}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 