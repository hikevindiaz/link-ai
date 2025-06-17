"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { RiSoundModuleLine, RiAddLine } from '@remixicon/react';

interface EmptyStateProps {
  userVoicesCount: number;
  onBrowseClick: () => void;
}

const EmptyState = ({ userVoicesCount, onBrowseClick }: EmptyStateProps) => {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900">
          <RiSoundModuleLine className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          {userVoicesCount > 0 
            ? 'Select a Voice' 
            : 'Create Custom Voices'}
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          {userVoicesCount > 0 
            ? 'Select a voice from the sidebar or create a new custom voice to add to your collection.' 
            : 'Combine OpenAI voices with custom descriptions to create unique voice personalities for your agents.'}
        </p>
        <Button 
          className="mt-6" 
          onClick={onBrowseClick}
        >
          <RiAddLine className="mr-2 h-4 w-4" />
          Create Your Voice
        </Button>
      </div>
    </div>
  );
};

export default EmptyState; 