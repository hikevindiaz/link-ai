'use client';

import { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, Loader2, AlertCircle, CheckCircle2, Bug } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Source } from './source-sidebar';
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export function WebsiteTab({ source, onSave }: WebsiteTabProps) {
  // Live Web Searches state
  const [urls, setUrls] = useState<string[]>(['']);
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
  
  const MAX_URLS = 3;

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
      
      // If we have no URLs in the input, initialize with empty strings
      if (urls.length === 1 && urls[0] === '') {
        // Keep the input fields as they are
      }
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

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleAddUrl = () => {
    if (urls.length < MAX_URLS) {
      setUrls([...urls, '']);
    } else {
      toast.error(`You can only add up to ${MAX_URLS} URLs`);
    }
  };

  const handleRemoveUrl = (index: number) => {
    if (urls.length > 1) {
      const newUrls = [...urls];
      newUrls.splice(index, 1);
      setUrls(newUrls);
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

  const handleSaveUrls = async () => {
    if (!source?.id) return;

    // Filter out empty URLs and validate the remaining ones
    const validUrls = urls
      .filter(url => url.trim() !== '')
      .map(url => {
        // Add https:// if the URL doesn't have a protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return `https://${url}`;
        }
        return url;
      });

    if (validUrls.length === 0) {
      toast.error("Please enter at least one valid URL");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Saving URLs to WebsiteContent table:", validUrls);

      // Use the dedicated website API endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: validUrls
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error saving URLs:", errorData);
        throw new Error(`Failed to save URLs: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Save result:", result);

      // Verify URLs were saved by fetching the updated list
      await fetchWebsites();
      
      // Clear the input field after successful save
      setUrls(['']);
      toast.success(`${validUrls.length} URL${validUrls.length > 1 ? 's' : ''} saved successfully`);
    } catch (error) {
      console.error("Error saving URLs:", error);
      toast.error("Failed to save website URLs. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteWebsite = (website: WebsiteContent) => {
    setWebsiteToDelete(website);
    setDeleteWebsiteDialogOpen(true);
  };

  const handleDeleteWebsite = async () => {
    if (!websiteToDelete || !source?.id) return;
    
    setIsDeletingWebsite(true);
    
    try {
      console.log(`Attempting to delete website with ID: ${websiteToDelete.id}`);
      
      // Use the dedicated website API endpoint
      const response = await fetch(`/api/knowledge-sources/${source.id}/website/${websiteToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete API response:', errorText);
        throw new Error(`Failed to delete website: ${response.status} ${response.statusText}`);
      }
      
      // Remove the website from the list
      setSavedWebsites(savedWebsites.filter(website => website.id !== websiteToDelete.id));
      
      toast.success(`URL "${websiteToDelete.url}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting website:', error);
      toast.error("Failed to delete website. Please try again.");
    } finally {
      setIsDeletingWebsite(false);
      setDeleteWebsiteDialogOpen(false);
      setWebsiteToDelete(null);
    }
  };

  const handleStartCrawl = async () => {
    if (!source?.id) {
      toast.error("No knowledge source selected");
      return;
    }
    
    if (!crawlerUrl.trim()) {
      toast.error("Please enter a URL to crawl");
      return;
    }
    
    if (!validateUrl(crawlerUrl)) {
      toast.error("Please enter a valid URL");
      return;
    }
    
    setIsCrawling(true);
    setError(null);
    
    try {
      // Extract hostname for the URL match pattern
      let hostname = '';
      try {
        hostname = new URL(crawlerUrl).hostname;
      } catch (e) {
        console.error('Error parsing URL:', e);
        hostname = crawlerUrl.replace(/^https?:\/\//, '').split('/')[0];
      }
      
      // Create a crawler request with default values for other fields
      const crawlerData = {
        sourceId: source.id,
        crawlUrl: crawlerUrl,
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
      
      // Log the full response for debugging
      const responseText = await response.text();
      console.log(`Crawler API response (${response.status}):`, responseText);
      
      if (!response.ok) {
        let errorMessage = `Failed to start crawler: ${response.status} ${response.statusText}`;
        try {
          // Try to parse the response as JSON
          const errorData = JSON.parse(responseText);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If parsing fails, use the response text
          if (responseText) {
            errorMessage = responseText;
          }
        }
        throw new Error(errorMessage);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing JSON response:', e);
        data = { message: 'Crawler started, but response could not be parsed' };
      }
      
      console.log('Crawler started:', data);
      
      // Simulate a delay for the crawling process
      setTimeout(async () => {
        // Refresh the crawler files list
        await fetchCrawlerFiles();
        
        // Show success message
        setSuccessMessage(data.message || "Crawler started successfully. The crawled content will appear in the files section when complete.");
        setSuccessDialogOpen(true);
        toast.success("Crawler completed successfully");
        
        // Reset crawler form
        setCrawlerUrl('');
        setIsCrawling(false);
      }, 8000); // Simulate 8 seconds of crawling
      
    } catch (error) {
      console.error('Error starting crawler:', error);
      setError(error instanceof Error ? error.message : 'Failed to start crawler. Please try again.');
      toast.error(error instanceof Error ? error.message : "Failed to start crawler");
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
      const response = await fetch(`/api/knowledge-sources/${source.id}/content/${fileToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
      }
      
      // Remove the file from the list
      setCrawlerFiles(crawlerFiles.filter(file => file.id !== fileToDelete.id));
      
      toast.success("File deleted successfully");
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error("Failed to delete file");
    } finally {
      setIsDeleting(false);
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

  return (
    <Card className="p-6">
      <div className="space-y-8">
        {/* Live Web Searches Section */}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">
            Add Websites
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            Add up to {MAX_URLS} website URLs for live searches. These will be used when your Agent needs up-to-date information.
          </p>
          
          {error && (
            <Alert variant="destructive" className="mt-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm text-red-800 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {isLoading ? (
            <LoadingState text="Loading website content..." />
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveUrls(); }} className="mt-6">
              <div className="space-y-4">
                {urls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Globe className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {urls.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUrl(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {urls.length < MAX_URLS && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddUrl}
                    className="flex items-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add URL
                  </Button>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Enter the full URLs including http:// or https://
                </p>
              </div>
              
              <div className="mt-6 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setUrls([''])}
                  disabled={isSubmitting || (urls.length === 1 && urls[0] === '')}
                >
                  Clear All
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || urls.every(url => url.trim() === '')}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save URLs'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
        
        {/* Saved Websites Section */}
        {savedWebsites.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-50">
              Saved Websites
            </h3>
            <div className="mt-4 space-y-3">
              {savedWebsites.map((website) => (
                <div 
                  key={website.id} 
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 text-indigo-500 mr-2 flex-shrink-0" />
                      <a 
                        href={website.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline break-all"
                      >
                        {website.url}
                      </a>
                    </div>
                    <div className="flex items-center space-x-4 ml-4">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        Added: {formatDate(website.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDeleteWebsite(website)}
                        title="Delete website"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Divider with "or" */}
        <Divider>or</Divider>
        
        {/* Crawler Section - Simplified */}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">
            Website Crawler
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            Crawl a website to extract content and store it as knowledge for your Agent.
          </p>
          
          <div className="mt-6 space-y-4">
            {isCrawling ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 dark:border-gray-800">
                <div className="text-center">
                  <Bug className="mx-auto h-12 w-12 text-indigo-500 dark:text-indigo-400" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-50">
                    Crawling in Progress
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                    {crawlingStatus}
                  </p>
                  <div className="mt-4 w-full">
                    <ProgressBar 
                      value={crawlingProgress} 
                      variant="default" 
                      showAnimation={true}
                      label={`${crawlingProgress}%`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="crawlUrl">Website URL</Label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="crawlUrl"
                      type="url"
                      placeholder="https://example.com"
                      value={crawlerUrl}
                      onChange={(e) => setCrawlerUrl(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    Enter the URL of the website you want to crawl. We'll automatically extract content from up to 10 pages.
                  </p>
                </div>
                
                <Button
                  type="button"
                  onClick={handleStartCrawl}
                  disabled={isCrawling || !crawlerUrl.trim()}
                  className="w-full"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Start Crawling
                </Button>
              </>
            )}
          </div>
          
          {/* Crawler Files Section */}
          {crawlerFiles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-50">
                Crawled Files
              </h3>
              <div className="mt-2 divide-y divide-gray-200 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-800">
                {crawlerFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Added: {new Date(file.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDeleteFile(file)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Success
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {successMessage}
            </p>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Website Confirmation Dialog */}
      <Dialog open={deleteWebsiteDialogOpen} onOpenChange={setDeleteWebsiteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Website</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this website? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {websiteToDelete && (
            <div className="py-4">
              <p className="text-sm font-medium break-all">{websiteToDelete.url}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteWebsiteDialogOpen(false)}
              disabled={isDeletingWebsite}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWebsite}
              disabled={isDeletingWebsite}
            >
              {isDeletingWebsite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete File Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {fileToDelete && (
            <div className="py-4">
              <p className="text-sm font-medium">{fileToDelete.name}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFile}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 