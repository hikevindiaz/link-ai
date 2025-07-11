"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RiSoundModuleLine, RiAddLine } from '@remixicon/react';

interface EmptyStateProps {
  userVoicesCount: number;
  onBrowseClick: () => void;
}

const EmptyState = ({ userVoicesCount, onBrowseClick }: EmptyStateProps) => {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="p-6 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col items-center max-w-md">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <RiSoundModuleLine className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          
          <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
            {userVoicesCount > 0 
              ? 'Select a Voice' 
              : 'Create Custom Voices'}
          </h3>
          
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 text-center">
            {userVoicesCount > 0 
              ? 'Select a voice from the sidebar or create a new custom voice to add to your collection.' 
              : 'Combine OpenAI voices with custom descriptions to create unique voice personalities for your agents.'}
          </p>
          
          <Button 
            onClick={onBrowseClick}
            size="sm"
          >
            <RiAddLine className="mr-2 h-4 w-4" />
            Create Your Voice
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default EmptyState; 