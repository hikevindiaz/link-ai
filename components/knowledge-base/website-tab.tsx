'use client';

import { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, Loader2, AlertCircle, CheckCircle2, Bug, RefreshCcw, Bot } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WebsiteTabProps {
  source?: Source;
}

interface WebsiteContent {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  knowledgeSourceId: string;
  instructions?: string;
}

interface CrawlerFile {
  id: string;
  name: string;
  createdAt: string;
  blobUrl?: string;
  crawlerId?: string; // To identify crawler-generated files
}

// Status tracking for website operations
interface WebsiteOperationStatus {
  id: string;
  url: string;
  status: 'saving' | 'processing' | 'complete' | 'error' | 'deleting' | 'training';
  progress: number;
  error?: string;
  instructions?: string;
}

interface PendingWebsiteAction {
  type: 'add' | 'delete';
  url?: string;
  websiteId?: string;
  instructions?: string;
}

type WebsiteStatusType = 'saving' | 'processing' | 'complete' | 'error' | 'deleting' | 'training';

export function WebsiteTab({ source }: WebsiteTabProps) {
  // Live Web Searches state
  const [liveSearchUrl, setLiveSearchUrl] = useState('');
  const [liveSearchInstructions, setLiveSearchInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWebsites, setSavedWebsites] = useState<WebsiteContent[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteWebsiteDialogOpen, setDeleteWebsiteDialogOpen] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<WebsiteContent | null>(null);
  const [isDeletingWebsite, setIsDeletingWebsite] = useState(false);
  
  // Progress status tracking
  const [processingWebsites, setProcessingWebsites] = useState<WebsiteOperationStatus[]>([]);
  
  // Helper function to update the progress of a website with a delay
  const progressStep = async (
    websiteId: string, 
    status: 'saving' | 'processing' | 'complete' | 'error' | 'deleting' | 'training',
    progress: number
  ) => {
    return new Promise<void>(resolve => {
      setTimeout(() => {
        setProcessingWebsites(prev => {
          const newState = prev.map(item => 
            item.id === websiteId
              ? { ...item, status, progress } 
              : item
          );
          return [...newState];
        });
        resolve();
      }, 500);
    });
  };
  
  // Crawler state
  const [crawlerUrl, setCrawlerUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlerFiles, setCrawlerFiles] = useState<CrawlerFile[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<CrawlerFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [crawlingProgress, setCrawlingProgress] = useState(0);
  const [crawlingStatus, setCrawlingStatus] = useState('');
  const [deleteProgress, setDeleteProgress] = useState<number>(0);
  
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
      // No need for this effect as we handle progress in handleStartCrawl
      // The logic there is more comprehensive and handles all the phases
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

  const handleAddLiveSearchUrl = async () => {
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

    // Create a temporary ID to track this operation
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Set submission state
    setIsSubmitting(true);
    
    // Add to processing with status tracking
    setProcessingWebsites(prev => [
      ...prev,
      {
        id: tempId,
        url: formattedUrl,
        status: 'saving',
        progress: 10,
        instructions: liveSearchInstructions.trim() || undefined
      }
    ]);
    
    try {
      // Step 1: Initial progress
      await progressStep(tempId, 'saving', 10);
      
      // Step 2: Saving to database (40%)
      await progressStep(tempId, 'saving', 40);
      
      // Prepare payload
      const payload = {
        urls: [formattedUrl],
      };
      
      // Only add instructions if they exist and aren't empty
      if (liveSearchInstructions && liveSearchInstructions.trim() !== '') {
        payload['instructions'] = liveSearchInstructions.trim();
      }
      
      // Make API call to save the website
      const response = await fetch(`/api/knowledge-sources/${source.id}/website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Step 3: Processing (70%)
      await progressStep(tempId, 'processing', 70);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        // Try to parse the error as JSON
        let errorMessage = `Failed to save website URL: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If it's not valid JSON, use the raw text
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Get the response data
      const data = await response.json();
      
      // Step 4: Complete (100%)
      await progressStep(tempId, 'complete', 100);
      
      // If successful, refresh the website list
      fetchWebsites();
      
      // Clear form fields
      setLiveSearchUrl('');
      setLiveSearchInstructions('');
      
      // Show success message
      toast.success("URL added successfully");
      
      // Remove from processing after delay
      setTimeout(() => {
        setProcessingWebsites(prev => prev.filter(item => item.id !== tempId));
      }, 3000);
      
    } catch (error) {
      console.error('Error adding website URL:', error);
      
      // Update status to error
      setProcessingWebsites(prev => {
        const newState = prev.map(item => 
          item.id === tempId
            ? { 
                ...item, 
                status: 'error' as const, 
                progress: 100,
                error: error instanceof Error ? error.message : 'Failed to add website URL' 
              } 
            : item
        );
        return [...newState];
      });
      
      toast.error(error instanceof Error ? error.message : "Failed to add website URL");
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
    
    const websiteId = websiteToDelete.id;
    const websiteUrl = websiteToDelete.url; // For status tracking
    
    // Add to processing websites with status tracking
    setProcessingWebsites(prev => [
      ...prev,
      {
        id: websiteId,
        url: websiteUrl,
        status: 'deleting',
        progress: 10
      }
    ]);
    
    setIsDeletingWebsite(true);
    
    // We won't close the dialog immediately to show the progress animation
    // setDeleteWebsiteDialogOpen(false);
    
    try {
      // Step 1: Start deleting (10%)
      await progressStep(websiteId, 'deleting', 10);
      
      // Step 2: Removing from database (40%)
      await progressStep(websiteId, 'deleting', 40);
      
      // Call the API to delete the website
      const response = await fetch(`/api/knowledge-sources/${source.id}/website/${websiteId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error deleting website:', errorText);
        throw new Error(`Failed to delete website: ${response.status}`);
      }
      
      // Actual deletion happened, but we'll continue animating the progress
      
      // Step 3: Processing completion (70%)
      await progressStep(websiteId, 'processing', 70);
      
      // Update UI by removing from local state
      setSavedWebsites(prev => prev.filter(website => website.id !== websiteId));
      
      // Step 4: Complete (100%) - slow this down for effect
      await progressStep(websiteId, 'complete', 85);
      await new Promise(resolve => setTimeout(resolve, 700));
      await progressStep(websiteId, 'complete', 100);
      
      // Show success message
      toast.success("Website removed successfully");
      
      // Added artificial delay before closing the dialog
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now close the dialog
      setDeleteWebsiteDialogOpen(false);
      
      // Remove from processing after delay
      setTimeout(() => {
        setProcessingWebsites(prev => prev.filter(item => item.id !== websiteId));
      }, 3000);
      
      // Reset state
      setWebsiteToDelete(null);
    } catch (error) {
      console.error('Error deleting website:', error);
      
      // Update status to error
      setProcessingWebsites(prev => {
        const newState = prev.map(item => 
          item.id === websiteId
            ? { 
                ...item, 
                status: 'error' as const, 
                progress: 100,
                error: error instanceof Error ? error.message : 'Failed to delete website' 
              } 
            : item
        );
        return [...newState];
      });
      
      toast.error(error instanceof Error ? error.message : "Failed to delete website");
      
      // Close dialog after error too, but with a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDeleteWebsiteDialogOpen(false);
      
    } finally {
      setIsDeletingWebsite(false);
    }
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
    setCrawlingProgress(5); // Start with initial progress
    setCrawlingStatus('Initializing crawler...');

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
      
      if (data.success) {
        // Start the crawling process
        try {
          const crawlResponse = await fetch(`/api/crawlers/${data.crawlerId}/crawling`, {
            method: 'POST'
          });

          if (!crawlResponse.ok) {
            const errorText = await crawlResponse.text();
            console.error(`Crawling API response (${crawlResponse.status}):`, errorText);
            
            // Parse the error response if possible
            let errorData: any = {};
            try {
              errorData = JSON.parse(errorText);
            } catch (e) {
              // If we can't parse JSON, use the raw text
              errorData = { error: errorText };
            }
            
            // Check for SSL certificate errors
            if (errorData?.cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || 
                errorText.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
                errorText.includes('certificate') ||
                errorText.includes('SSL')) {
              toast.error(
                "SSL Certificate Error: The website has an invalid certificate. Please try again - the system will attempt to bypass certificate verification.", 
                { duration: 6000 }
              );
              
              // Wait a moment and try again with a different approach
              setTimeout(async () => {
                try {
                  toast.info("Retrying with relaxed security settings...");
                  const retryResponse = await fetch(`/api/crawlers/${data.crawlerId}/crawling`, {
                    method: 'POST',
                    headers: {
                      'X-Bypass-SSL-Verification': 'true'
                    }
                  });
                  
                  if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    console.log('Retry was successful:', retryData);
                    
                    // Update the file list
                    fetchCrawlerFiles();
                    
                    // Show success message
                    setSuccessMessage("Website was crawled successfully with relaxed security verification. Content has been added to your knowledge base.");
                    setSuccessDialogOpen(true);
                  } else {
                    throw new Error(`Retry attempt failed: ${retryResponse.status}`);
                  }
                } catch (retryError) {
                  console.error('Retry attempt failed:', retryError);
                  toast.error("Could not crawl this website, even with relaxed security. Please try a different website.");
                } finally {
                  setIsCrawling(false);
                  setCrawlingProgress(0);
                  setCrawlingStatus('');
                }
              }, 2000);
              
              return;
            }
            
            throw new Error(`Failed to start crawling: ${crawlResponse.status} ${crawlResponse.statusText}`);
          }

          const crawlData = await crawlResponse.json();
          console.log('Crawling process started:', crawlData);
          
          // Set progress based on status from response
          setCrawlingProgress(10);
          if (data.status?.estimatedTimeMinutes) {
            setCrawlingStatus(`Estimated time: ${data.status.estimatedTimeMinutes} minutes`);
          }
        } catch (crawlError) {
          console.error('Error starting crawler:', crawlError);
          
          // Show a more helpful error message for SSL certificate issues
          if (crawlError instanceof Error && 
              (crawlError.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') || 
               crawlError.message.includes('certificate') ||
               crawlError.message.includes('SSL'))) {
            toast.error("SSL Certificate Error: The website has an invalid or expired SSL certificate. Try again - the system will attempt to crawl with relaxed security settings.");
          } else {
            toast.error(crawlError instanceof Error ? crawlError.message : "Failed to start crawler");
          }
          
          setIsCrawling(false);
          setCrawlingProgress(0);
          setCrawlingStatus('');
          return;
        }
      }
      
      // Simulate the crawling progress (in a real implementation this would use WebSockets or polling)
      let progress = 10;
      const interval = setInterval(() => {
        progress += 5;
        setCrawlingProgress(progress);
        
        // Update status based on progress phases
        if (progress < 30) {
          setCrawlingStatus('Scanning website structure...');
        } else if (progress < 50) {
          setCrawlingStatus('Extracting content from pages...');
        } else if (progress < 70) {
          setCrawlingStatus('Processing content for Agent knowledge...');
        } else if (progress < 90) {
          setCrawlingStatus('Adding content to knowledge base...');
        } else {
          setCrawlingStatus('Finalizing crawl operation...');
        }
        
        // When we reach 100%, clear the interval and finish
        if (progress >= 100) {
          clearInterval(interval);
          setCrawlingStatus('Crawl complete! Content added to knowledge base.');
          
          // Refresh the file list
          fetchCrawlerFiles();
          
          // Show success message
          setSuccessMessage(data.message || "Website crawled successfully. Click 'Save Changes' to add the content to your knowledge base and make it available to your agents.");
          setSuccessDialogOpen(true);
          toast.success("Crawler completed successfully");
          
          // Reset form fields and state
          setCrawlerUrl('');
          setIsCrawling(false);
          
          // Keep the progress UI visible for a moment before resetting
          setTimeout(() => {
            setCrawlingProgress(0);
            setCrawlingStatus('');
          }, 3000);
        }
      }, 1000);
      
      // In case of error, make sure to clear the interval
      setTimeout(() => {
        clearInterval(interval);
        // If we're still crawling after 2 minutes, there might be an issue
        if (isCrawling && progress < 100) {
          setCrawlingProgress(0);
          setCrawlingStatus('');
          setIsCrawling(false);
          toast.error("Crawler timed out. Please check the files section to see if any content was captured.");
        }
      }, 120000); // 2 minute timeout
      
    } catch (error) {
      console.error('Error starting crawler:', error);
      
      // Show a more helpful error message for SSL certificate issues
      if (error instanceof Error && 
          (error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') || 
           error.message.includes('certificate') ||
           error.message.includes('SSL'))) {
        toast.error("SSL Certificate Error: The website has an invalid or expired SSL certificate. We're attempting to crawl it with reduced security verification. Try again or use a different website.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to start crawler");
      }
      
      setIsCrawling(false);
      setCrawlingProgress(0);
      setCrawlingStatus('');
    }
  };

  const confirmDeleteFile = (file: CrawlerFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete || !source?.id) return;

    setIsDeleting(true);
    setDeleteProgress(0);
    const toastId = toast.loading("Deleting file and cleaning up resources...");

    try {
      // Simulate progress during deletion
      const progressInterval = setInterval(() => {
        setDeleteProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 10) + 5;
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 800);
      
      // Make API call to delete file
      const response = await fetch(`/api/knowledge-sources/${source.id}/content/${fileToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to delete file: ${response.statusText}`);
      }

      // Update UI by removing deleted file
      setCrawlerFiles(prev => prev.filter(file => file.id !== fileToDelete.id));
      
      // Clear the progress interval
      clearInterval(progressInterval);
      
      // Set to 100% when complete
      setDeleteProgress(100);
      
      // Add artificial delay to show the progress animation
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Close dialog and reset state (delayed)
      toast.dismiss(toastId);
      toast.success(data.message || "File deleted successfully");
      
      // Added artificial delay before closing the dialog
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.dismiss(toastId);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          // If file is not found, we can consider it deleted
          setCrawlerFiles(prev => prev.filter(file => file.id !== fileToDelete?.id));
          
          // Added artificial delay before closing the dialog
          await new Promise(resolve => setTimeout(resolve, 1000));
          setDeleteDialogOpen(false);
          setFileToDelete(null);
          toast.success("File has been removed from your knowledge base");
        } else {
          toast.error(`Error: ${error.message}`);
          // Added artificial delay before closing the dialog
          await new Promise(resolve => setTimeout(resolve, 1500));
          setDeleteDialogOpen(false);
        }
      } else {
        toast.error("An unexpected error occurred while deleting the file");
        // Added artificial delay before closing the dialog
        await new Promise(resolve => setTimeout(resolve, 1500));
        setDeleteDialogOpen(false);
      }
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
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

  const renderWebsiteProgress = (website: WebsiteOperationStatus) => {
    const getStatusText = () => {
      switch (website.status) {
        case 'saving': 
          if (website.progress < 20) return 'Initializing website capture...';
          if (website.progress < 40) return 'Saving website content...';
          if (website.progress < 60) return 'Processing website content...';
          return 'Finalizing website data...';
        case 'processing': 
          if (website.progress < 30) return 'Crawling website content...';
          if (website.progress < 60) return 'Extracting valuable information...';
          if (website.progress < 85) return 'Organizing website data...';
          return 'Final processing steps...';
        case 'training': 
          if (website.progress < 25) return 'Starting Agent training...';
          if (website.progress < 50) return 'Teaching Agent about website content...';
          if (website.progress < 75) return 'Agent is learning website information...';
          return 'Finalizing website knowledge...';
        case 'complete': return 'Operation completed successfully';
        case 'error': return website.error || 'Error occurred';
        case 'deleting':
          if (website.progress < 25) return 'Beginning website deletion...';
          if (website.progress < 50) return 'Removing website from knowledge base...';
          if (website.progress < 75) return 'Cleansing Agent memory...';
          return 'Almost done with removal...';
        default: return 'Processing...';
      }
    };
    
    return (
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
          <span className="font-medium text-neutral-600 dark:text-neutral-400">
            {getStatusText()}
          </span>
        </div>
        <Badge variant="secondary" className="bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400">
          {website.progress}%
        </Badge>
      </div>
    );
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
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
                    Add Website Content
                  </h2>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Add website content to this knowledge source. Your Agent will be able to reference information from these websites when responding to queries.
                </p>
              </div>
              
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
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      id="websiteUrl"
                      name="websiteUrl"
                      placeholder="https://example.com"
                      value={liveSearchUrl}
                      onChange={(e) => setLiveSearchUrl(e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1"
                      maxLength={500}
                    />
                    <Button onClick={handleAddLiveSearchUrl} disabled={isSubmitting} className="whitespace-nowrap bg-black hover:bg-gray-800 text-white">
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
                  <div className="flex justify-end">
                    <span className="text-xs text-neutral-500">
                      {liveSearchUrl.length}/500
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 space-y-2">
                  <Input
                    id="websiteInstructions"
                    name="websiteInstructions"
                    placeholder="When should the agent use this URL? (e.g., 'when asked about pricing' or 'for questions about products')"
                    value={liveSearchInstructions}
                    onChange={(e) => setLiveSearchInstructions(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full"
                    maxLength={200}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Optional. Provide instructions for when your Agent should search this specific URL.
                    </p>
                    <span className="text-xs text-neutral-500">
                      {liveSearchInstructions.length}/200
                    </span>
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-xl border border-blue-100 dark:border-blue-900">
                  <div className="flex items-start gap-2">
                    <RiInformationLine className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">When to use Live Search URLs:</p>
                      <ul className="list-disc list-inside space-y-1 pl-1">
                        <li>For frequently updated content like documentation that changes often</li>
                        <li>When you need the most current information from your website</li>
                        <li>For content that should be searched when directly mentioned by users</li>
                      </ul>
                      <p className="mt-2">For static content that rarely changes, use the <strong>Crawled Content</strong> tab instead.</p>
                    </div>
                  </div>
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
                        <TableCell className="whitespace-nowrap">Instructions</TableCell>
                        <TableCell className="whitespace-nowrap">Added On</TableCell>
                        <TableCell className="w-[100px]">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {savedWebsites.map((website) => (
                        <TableRow key={website.id}>
                          <TableCell className="font-medium break-all">{website.url}</TableCell>
                          <TableCell className="max-w-[250px] truncate">
                            {website.instructions || 
                              <span className="text-muted-foreground italic text-sm">No instructions</span>
                            }
                          </TableCell>
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
                  <div className="mt-6 flex justify-center items-center py-12 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20">
                    <div className="text-center">
                      <RiGlobalLine className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        No URLs added yet
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
                        Add URLs for your Agent to search when answering questions
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="crawler" className="space-y-4 pt-4">
          <Card className="p-6">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-medium text-gray-900 dark:text-gray-50">
                    Add Website Content
                  </h2>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Add website content to this knowledge source. Your Agent will be able to reference information from these websites when responding to queries.
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-start gap-2">
                  <RiInformationLine className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium mb-1">About Website Crawling</p>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      <li>The crawler will extract content from the website and add it to your knowledge base</li>
                      <li>Crawled content is processed automatically and immediately available to your Agent</li>
                      <li>For best results, crawl specific pages rather than entire sites</li>
                      <li>Use this for static content that doesn't change frequently</li>
                    </ul>
                  </div>
                </div>
              </div>
              
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
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      id="crawlerUrl"
                      name="crawlerUrl"
                      placeholder="https://example.com"
                      value={crawlerUrl}
                      onChange={(e) => setCrawlerUrl(e.target.value)}
                      disabled={isCrawling}
                      className="flex-1"
                      maxLength={500}
                    />
                    <Button 
                      onClick={handleStartCrawl} 
                      disabled={isCrawling}
                      className="whitespace-nowrap bg-black hover:bg-gray-800 text-white"
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
                  <div className="flex justify-end">
                    <span className="text-xs text-neutral-500">
                      {crawlerUrl.length}/500
                    </span>
                  </div>
                </div>
                
                {crawlingProgress > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{crawlingStatus}</span>
                      <span className="text-sm font-medium">{crawlingProgress}%</span>
                    </div>
                    <Progress value={crawlingProgress} className="h-2" />
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
                        <TableCell className="w-[180px]">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {crawlerFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium break-all">{file.name}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(file.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => confirmDeleteFile(file)}
                                className="flex items-center gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                              >
                                <RiDeleteBinLine className="h-4 w-4" />
                                <span>Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="mt-6 flex justify-center items-center py-12 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20">
                    <div className="text-center">
                      <RiGlobalLine className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        No crawled website files
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">
                        Crawl a website to add content to your knowledge base
                      </p>
                    </div>
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
          <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden text-ellipsis">
            {websiteToDelete?.url}
          </div>
          
          {isDeletingWebsite && (
            <div className="mt-2 space-y-3 pb-4">
              {renderWebsiteProgress(processingWebsites.find(w => w.id === websiteToDelete?.id) as WebsiteOperationStatus)}
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
            <DialogTitle>Delete Crawled Content</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this crawled content? This will remove it from your knowledge base and vector store. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="font-medium">File name:</span>
                <span className="text-gray-600 dark:text-gray-400">{fileToDelete?.name}</span>
              </div>
              {fileToDelete?.blobUrl && (
                <div className="flex items-center gap-2">
                  <RiGlobalLine className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Source URL:</span>
                  <span className="text-gray-600 dark:text-gray-400 break-all">{fileToDelete.blobUrl}</span>
                </div>
              )}
            </div>
          </div>
          
          {isDeleting && (
            <div className="mt-3 space-y-3 pb-4">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                  <span className="font-medium text-neutral-600 dark:text-neutral-400">
                    {deleteProgress < 25 
                      ? "Starting content deletion process..." 
                      : deleteProgress < 50
                        ? "Removing content from knowledge base..."
                        : deleteProgress < 75
                          ? "Cleansing vector embeddings..."
                          : "Finalizing cleanup operations..."}
                  </span>
                </div>
                <Badge variant="secondary" className="bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400">
                  {deleteProgress}%
                </Badge>
              </div>
              <Progress 
                value={deleteProgress} 
                className="h-2 bg-neutral-100 text-neutral-600"
              />
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
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <RiDeleteBinLine className="h-4 w-4" />
                  Delete
                </>
              )}
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