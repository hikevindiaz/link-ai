'use client';

import { useState, useEffect } from 'react';
import { Source } from './source-sidebar';
import { RiFileExcelLine, RiFileTextLine, RiGlobalLine, RiQuestionAnswerLine, RiListCheck2, RiEdit2Line, RiCheckLine } from '@remixicon/react';
import { toast } from "sonner";
import FileUploadTab from './file-upload-tab';
import { WebsiteTab } from './website-tab';
import { QATab } from './qa-tab';
import { CatalogTab } from './catalog-tab';
import { TextContentTab } from './text-tab';
import { TabNavigation, TabNavigationLink } from "@/components/TabNavigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useKnowledgeBase } from '@/app/(dashboard)/dashboard/knowledge-base/layout';

interface SourceSettingsProps {
  source: Source;
  onSave: (data: any) => Promise<void>;
}

export function SourceSettings({ source, onSave }: SourceSettingsProps) {
  const [activeTab, setActiveTab] = useState('files');
  const { isDirty, pendingChanges } = useKnowledgeBase();
  const hasChangesForThisSource = pendingChanges[source.id] !== undefined;

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
        return <FileUploadTab source={source} onSave={handleSave} />;
      case 'text':
        return <TextContentTab source={source} onSave={handleSave} />;
      case 'website':
        return <WebsiteTab source={source} onSave={handleSave} />;
      case 'qa':
        return <QATab source={source} onSave={handleSave} />;
      case 'catalog':
        return <CatalogTab source={source} onSave={handleSave} />;
      default:
        return <FileUploadTab source={source} onSave={handleSave} />;
    }
  };

  // Custom styling for active tab
  const getTabClassName = (tabName: string) => {
    const baseClasses = "inline-flex gap-2";
    const activeClasses = "text-indigo-600 font-medium border-b-2 border-indigo-600 dark:text-indigo-500 dark:border-indigo-500";
    const inactiveClasses = "text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-700";
    
    return `${baseClasses} ${activeTab === tabName ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">
            {source.name}
          </h1>
          <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-500">
            Manage your knowledge source content
          </p>
        </div>
        
        <div className="flex items-center">
          {hasChangesForThisSource ? (
            <Badge variant="secondary" className="ml-2 flex items-center gap-1 bg-amber-100 text-amber-600 font-medium dark:bg-amber-900/20 dark:text-amber-400 px-3 py-1">
              <RiEdit2Line className="h-4 w-4" />
              <span>Needs Saving</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="ml-2 flex items-center gap-1 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
              <RiCheckLine className="h-3 w-3" />
              <span>Up to Date</span>
            </Badge>
          )}
        </div>
      </div>
      
      <Separator className="my-6" />

      <div className="mt-8">
        <TabNavigation>
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
        </TabNavigation>
        
        <div className="mt-8">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
} 