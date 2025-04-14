"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { RiSoundModuleLine } from '@remixicon/react';

interface EmptyStateProps {
  userVoicesCount: number;
  onBrowseClick: () => void;
}

const EmptyState = ({ userVoicesCount, onBrowseClick }: EmptyStateProps) => {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
          <RiSoundModuleLine className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          {userVoicesCount > 0 
            ? 'Select a Voice' 
            : 'Welcome to Voice Library'}
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {userVoicesCount > 0 
            ? 'Select a voice from the sidebar or browse the library below to add more voices to your collection.' 
            : 'Browse our premium AI voices to enhance your agents with natural-sounding speech.'}
        </p>
        <Button 
          className="mt-6" 
          onClick={onBrowseClick}
        >
          <RiSoundModuleLine className="mr-2 h-4 w-4" />
          Browse Voice Library
        </Button>
      </div>
    </div>
  );
};

export default EmptyState; 