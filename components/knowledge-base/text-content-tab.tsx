'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Loader2, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TextContentTabProps {
  onSave: (data: any) => Promise<void>;
}

export function TextContentTab({ onSave }: TextContentTabProps) {
  const [textContent, setTextContent] = useState('');
  const [vectorStoreStatus, setVectorStoreStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handleSaveText = async () => {
    if (!textContent.trim()) {
      toast.error("Text content cannot be empty");
      return;
    }
    
    try {
      setVectorStoreStatus('processing');
      await onSave({ textContent });
      setVectorStoreStatus('success');
      toast.success("Text content saved successfully");
    } catch (error) {
      console.error('Error saving text content:', error);
      setVectorStoreStatus('error');
      toast.error("Failed to save text content");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center space-x-2">
        <h3 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
          Text Content
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-tremor-content dark:text-dark-tremor-content cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p>Text content is added to the AI knowledge base and processed for vector search. 
            Your agent will be able to search and retrieve this information when answering questions.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <p className="mt-1 text-tremor-default text-tremor-content dark:text-dark-tremor-content">
        Add text content that will be used as knowledge for your AI agents.
      </p>
      
      <div className="mt-6">
        <Textarea 
          placeholder="Enter your text content here..." 
          className="min-h-[300px] w-full rounded-tremor-small"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          disabled={vectorStoreStatus === 'processing'}
        />
      </div>
      
      <div className="mt-6 flex items-center space-x-4">
        <button
          type="button"
          onClick={handleSaveText}
          disabled={vectorStoreStatus === 'processing' || !textContent.trim()}
          className="whitespace-nowrap rounded-tremor-small bg-tremor-brand px-4 py-2.5 text-tremor-default font-medium text-tremor-brand-inverted shadow-tremor-input hover:bg-tremor-brand-emphasis dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted dark:shadow-dark-tremor-input dark:hover:bg-dark-tremor-brand-emphasis disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Content
        </button>
        
        {vectorStoreStatus === 'processing' && (
          <div className="flex items-center text-tremor-content dark:text-dark-tremor-content">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>Processing for AI knowledge base...</span>
          </div>
        )}
        
        {vectorStoreStatus === 'success' && (
          <div className="text-green-600 dark:text-green-400">
            Content successfully added to AI knowledge base
          </div>
        )}
        
        {vectorStoreStatus === 'error' && (
          <div className="text-red-600 dark:text-red-400">
            Error adding content to AI knowledge base
          </div>
        )}
      </div>
      
      {vectorStoreStatus === 'success' && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-tremor-small text-sm text-green-700 dark:text-green-300">
          <p className="font-medium">Knowledge Base Updated</p>
          <p className="mt-1">This text has been processed and is now available to your AI agents. 
          It may take a few moments for the changes to propagate to all connected agents.</p>
        </div>
      )}
    </div>
  );
} 