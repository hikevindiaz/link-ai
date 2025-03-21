'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";

interface TextContentTabProps {
  onSave: (data: any) => Promise<void>;
}

export function TextContentTab({ onSave }: TextContentTabProps) {
  const [textContent, setTextContent] = useState('');

  const handleSaveText = async () => {
    try {
      await onSave({ textContent });
      toast.success("Text content saved successfully");
    } catch (error) {
      console.error('Error saving text content:', error);
      toast.error("Failed to save text content");
    }
  };

  return (
    <div className="max-w-3xl">
      <h3 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
        Text Content
      </h3>
      <p className="mt-1 text-tremor-default text-tremor-content dark:text-dark-tremor-content">
        Add text content that will be used as knowledge for your AI agents.
      </p>
      
      <div className="mt-6">
        <Textarea 
          placeholder="Enter your text content here..." 
          className="min-h-[300px] w-full rounded-tremor-small"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
        />
      </div>
      
      <div className="mt-6">
        <button
          type="button"
          onClick={handleSaveText}
          className="whitespace-nowrap rounded-tremor-small bg-tremor-brand px-4 py-2.5 text-tremor-default font-medium text-tremor-brand-inverted shadow-tremor-input hover:bg-tremor-brand-emphasis dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted dark:shadow-dark-tremor-input dark:hover:bg-dark-tremor-brand-emphasis"
        >
          Save Content
        </button>
      </div>
    </div>
  );
} 