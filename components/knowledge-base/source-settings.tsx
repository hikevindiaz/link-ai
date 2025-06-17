'use client';

import { useState, useEffect } from 'react';
import { Source } from './source-sidebar';
import { RiFileExcelLine, RiFileTextLine, RiGlobalLine, RiQuestionAnswerLine, RiListCheck2, RiEdit2Line, RiCheckLine, RiClipboardLine, RiDraftLine, RiCheckboxCircleLine } from '@remixicon/react';
import { toast } from "sonner";
import FileUploadTab from './file-upload-tab';
import { WebsiteTab } from './website-tab';
import QATab from './qa-tab';
import { CatalogTab } from './catalog-tab';
import { TextContentTab } from './text-tab';
import { TabNavigation, TabNavigationLink } from "@/components/TabNavigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useKnowledgeBase } from '@/app/(dashboard)/dashboard/knowledge-base/layout';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RiLinkM, RiCheckLine as RiCheckLineIcon } from '@remixicon/react';

// Knowledge Source Badge Component
export function KnowledgeSourceBadge({ 
  hasContent, 
  isAssigned, 
  isLoading, 
  needsSaving,
  compact = false
}: { 
  hasContent: boolean, 
  isAssigned: boolean, 
  isLoading: boolean, 
  needsSaving?: boolean,
  compact?: boolean 
}) {
  // If compact mode is enabled, just show a colored dot
  if (compact) {
    // While loading, show pulsing neutral dot
    if (isLoading) {
      return (
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-400 animate-pulse"></span>
      );
    }
    
    // If needs saving, show amber dot
    if (needsSaving) {
      return (
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
      );
    }
    
    // Assigned gets green dot
    if (isAssigned) {
      return (
        <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
      );
    }
    
    // Has content but not assigned gets yellow dot
    if (hasContent) {
      return (
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
      );
    }
    
    // Draft (no content) gets neutral dot
    return (
      <span className="h-2.5 w-2.5 rounded-full bg-neutral-400"></span>
    );
  }
  
  // Regular mode (non-compact) - keep the original badges
  const baseClasses = "flex items-center gap-1 px-3 py-1 font-medium";
    
  // Show needs saving badge if there are pending changes
  if (needsSaving) {
    return (
      <Badge variant="secondary" className={`${baseClasses} bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400`}>
        <RiEdit2Line className="h-4 w-4" />
        <span>Needs Saving</span>
      </Badge>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <Badge variant="secondary" className={`${baseClasses} bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400`}>
        <span className="h-3 w-3 rounded-full bg-neutral-500 animate-pulse"></span>
        <span>Checking...</span>
      </Badge>
    );
  }
  
  // Different badges based on status - prioritize assignment over content
  if (isAssigned) {
    return (
      <Badge variant="secondary" className={`${baseClasses} bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400`}>
        <RiLinkM className="h-3.5 w-3.5" />
        <span>Assigned</span>
      </Badge>
    );
  }
  
  if (hasContent) {
    return (
      <Badge variant="secondary" className={`${baseClasses} bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400`}>
        <RiCheckboxCircleLine className="h-3.5 w-3.5" />
        <span>Available</span>
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className={`${baseClasses} bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400`}>
      <RiDraftLine className="h-3.5 w-3.5" />
      <span>Draft</span>
    </Badge>
  );
}

interface SourceSettingsProps {
  source: Source;
  onSave: (data: any) => Promise<void>;
}

export function SourceSettings({ source, onSave }: SourceSettingsProps) {
  const [activeTab, setActiveTab] = useState('files');
  const { isDirty, pendingChanges } = useKnowledgeBase();
  const [hasContent, setHasContent] = useState<boolean>(false);
  const [isCheckingContent, setIsCheckingContent] = useState<boolean>(true);
  const [isAssigned, setIsAssigned] = useState<boolean>(false);
  const [copyTooltip, setCopyTooltip] = useState("Copy ID");
  const [copySuccess, setCopySuccess] = useState(false);
  const hasChangesForThisSource = pendingChanges[source.id] !== undefined;

  useEffect(() => {
    // Check if any tab has content
    const checkForContent = async () => {
      setIsCheckingContent(true);
      try {
        // Initialize with defaults in case of errors
        let hasFiles = false;
        let hasText = false;
        let hasQA = false;
        let hasWebsite = false;
        let hasProducts = false;
        let isAssigned = false;
        
        // Check files
        try {
          const filesResponse = await fetch(`/api/knowledge-sources/${source.id}/files`);
          if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            hasFiles = Array.isArray(filesData) && filesData.length > 0;
          }
        } catch (error) {
          console.error(`Error fetching files for source ${source.id}:`, error);
        }
        
        // Check text content
        try {
          const textResponse = await fetch(`/api/knowledge-sources/${source.id}/text-content`);
          if (textResponse.ok) {
            const textData = await textResponse.json();
            hasText = Array.isArray(textData) && textData.length > 0;
          }
        } catch (error) {
          console.error(`Error fetching text content for source ${source.id}:`, error);
        }
        
        // Check QA content
        try {
          const qaResponse = await fetch(`/api/knowledge-sources/${source.id}/qa`);
          if (qaResponse.ok) {
            const qaData = await qaResponse.json();
            hasQA = Array.isArray(qaData) && qaData.length > 0;
          }
        } catch (error) {
          console.error(`Error fetching QA content for source ${source.id}:`, error);
        }
        
        // Check website content
        try {
          const websiteResponse = await fetch(`/api/knowledge-sources/${source.id}/websites`);
          if (websiteResponse.ok) {
            const websiteData = await websiteResponse.json();
            hasWebsite = Array.isArray(websiteData) && websiteData.length > 0;
          }
        } catch (error) {
          console.error(`Error fetching website content for source ${source.id}:`, error);
        }
        
        // Check catalog content
        try {
          const catalogResponse = await fetch(`/api/knowledge-sources/${source.id}/catalog`);
          if (catalogResponse.ok) {
            const catalogData = await catalogResponse.json();
            // Check if catalog has products
            if (catalogData && typeof catalogData === 'object') {
              if (catalogData.products && Array.isArray(catalogData.products)) {
                hasProducts = catalogData.products.length > 0;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching catalog content for source ${source.id}:`, error);
        }
        
        // Check if assigned to any agents
        try {
          const assignedResponse = await fetch(`/api/knowledge-sources/${source.id}/assigned-agents`);
          if (assignedResponse.ok) {
            const assignedData = await assignedResponse.json();
            isAssigned = Array.isArray(assignedData) && assignedData.length > 0;
          }
        } catch (error) {
          console.error(`Error fetching assigned agents for source ${source.id}:`, error);
        }
        
        // Debug log to see what we're getting from the API
        console.log(`Source Settings ${source.id} status:`, { 
          hasFiles,
          hasText,
          hasQA,
          hasWebsite,
          hasProducts,
          isAssigned
        });
        
        // Set assignment status
        setIsAssigned(isAssigned);
        
        // Set has content if any of these have data
        const hasContent = hasFiles || hasText || hasQA || hasWebsite || hasProducts;
        setHasContent(hasContent);
      } catch (error) {
        console.error('Error checking for content:', error);
        setIsAssigned(false);
        setHasContent(false);
      } finally {
        setIsCheckingContent(false);
      }
    };
    
    if (source?.id) {
      checkForContent();
    }
  }, [source?.id]);

  const handleCopySourceId = () => {
    navigator.clipboard.writeText(source.id)
      .then(() => {
        toast.success('Source ID copied to clipboard');
        setCopyTooltip("Copied!");
        setCopySuccess(true);
        setTimeout(() => {
          setCopyTooltip("Copy ID");
          setCopySuccess(false);
        }, 2000);
      })
      .catch((err) => {
        console.error('Could not copy ID: ', err);
        toast.error('Failed to copy ID');
      });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleSave = async (data: any) => {
    try {
      // Add the source ID to the data if not already present
      const dataWithSource = {
        ...data,
        sourceId: data.sourceId || source.id
      };
      
      await onSave(dataWithSource);
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error("Failed to save data");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'files':
        return <FileUploadTab source={source} />;
      case 'text':
        return <TextContentTab source={source} />;
      case 'website':
        return <WebsiteTab source={source} />;
      case 'qa':
        return <QATab source={source} />;
      case 'catalog':
        return <CatalogTab source={source} onSave={handleSave} />;
      default:
        return <FileUploadTab source={source} />;
    }
  };

  // Custom styling for active tab
  const getTabClassName = (tabName: string) => {
    const baseClasses = "inline-flex gap-2";
    const activeClasses = "text-neutral-600 font-medium border-b-2 border-neutral-600 dark:text-neutral-500 dark:border-neutral-500";
    const inactiveClasses = "text-neutral-500 hover:text-neutral-700 hover:border-b-2 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300 dark:hover:border-neutral-700";
    
    return `${baseClasses} ${activeTab === tabName ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {source.name}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Manage your knowledge source content
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <KnowledgeSourceBadge 
            hasContent={hasContent} 
            isAssigned={isAssigned} 
            isLoading={isCheckingContent} 
            needsSaving={hasChangesForThisSource} 
          />
          
          {/* Source ID with copy button */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-6 w-6 p-0 transition-colors duration-200 ${
                      copySuccess 
                        ? "text-green-500 bg-green-50 hover:text-green-600 dark:bg-green-900/20 dark:text-green-400" 
                        : "text-neutral-500 hover:text-neutral-600"
                    }`}
                    onClick={handleCopySourceId}
                  >
                    {copySuccess ? (
                      <RiCheckLineIcon className="h-3.5 w-3.5" />
                    ) : (
                      <RiClipboardLine className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{copyTooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-mono text-neutral-700 dark:text-neutral-300">
              {source.id}
            </code>
          </div>
        </div>
      </div>
      
      <div className="-mx-6 mt-4">
        <TabNavigation className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="px-6">
            <TabNavigationLink 
              href="#" 
              className={getTabClassName('files')}
              onClick={(e) => { e.preventDefault(); handleTabChange('files'); }}
            >
              <RiFileExcelLine className="size-4" aria-hidden="true" />
              Files
            </TabNavigationLink>
            
            <TabNavigationLink 
              href="#" 
              className={getTabClassName('text')}
              onClick={(e) => { e.preventDefault(); handleTabChange('text'); }}
            >
              <RiFileTextLine className="size-4" aria-hidden="true" />
              Text
            </TabNavigationLink>
            
            <TabNavigationLink 
              href="#" 
              className={getTabClassName('website')}
              onClick={(e) => { e.preventDefault(); handleTabChange('website'); }}
            >
              <RiGlobalLine className="size-4" aria-hidden="true" />
              Website
            </TabNavigationLink>
            
            <TabNavigationLink 
              href="#" 
              className={getTabClassName('qa')}
              onClick={(e) => { e.preventDefault(); handleTabChange('qa'); }}
            >
              <RiQuestionAnswerLine className="size-4" aria-hidden="true" />
              Q&A
            </TabNavigationLink>
            
            <TabNavigationLink 
              href="#" 
              className={getTabClassName('catalog')}
              onClick={(e) => { e.preventDefault(); handleTabChange('catalog'); }}
            >
              <RiListCheck2 className="size-4" aria-hidden="true" />
              Catalog
            </TabNavigationLink>
          </div>
        </TabNavigation>
        
        <div className="px-6 mt-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
} 