"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/Input';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { RiDeleteBinLine } from '@remixicon/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CustomVoice {
  id: string;
  name: string;
  openaiVoice: string;
  description?: string;
  language?: string;
  isDefault: boolean;
  addedOn: string;
}

interface VoiceDetailProps {
  voice: CustomVoice;
  isPlaying: boolean;
  isSaving: boolean;
  textInput: string;
  onRemove: (voiceId: string) => void;
  onEdit: (voice: CustomVoice) => void;
  onTextChange: (voiceId: string, text: string) => void;
  onPlay: (voice: CustomVoice) => void;
  getImportantTags: (voice: CustomVoice) => {key: string, value: string}[];
  getDefaultTextForVoice: (voice: CustomVoice) => string;
}

const VoiceDetail = ({
  voice,
  isPlaying,
  isSaving,
  textInput,
  onRemove,
  onEdit,
  onTextChange,
  onPlay,
  getImportantTags,
  getDefaultTextForVoice
}: VoiceDetailProps) => {
  // Utility function to capitalize voice names properly
  const capitalizeVoiceName = (name: string): string => {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const handleDelete = () => {
    onRemove(voice.id);
  };

  return (
    <div className="p-6">
      <header className="border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-4">
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {capitalizeVoiceName(voice.name)}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {getImportantTags(voice).map((tag, tagIndex) => (
                <Badge key={tagIndex} variant="default" className="text-xs px-2 py-0">
                  {tag.value}
                </Badge>
              ))}
            </div>
            
            {/* Voice Description */}
            {voice.description && (
              <div className="mt-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">Description:</span> {voice.description}
                </p>
              </div>
            )}
            
            {/* Base Voice Info */}
            <div className="mt-2">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                <span className="font-medium">Base Voice:</span> {capitalizeVoiceName(voice.openaiVoice)}
                {voice.language && (
                  <span className="ml-2">
                    • <span className="font-medium">Language:</span> {voice.language}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 sm:ml-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                onClick={() => onEdit(voice)}
                disabled={isSaving}
              >
                <i className="ri-edit-line mr-2 h-4 w-4" />
                Edit
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isSaving}
                  >
                    <RiDeleteBinLine className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Voice?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{capitalizeVoiceName(voice.name)}"? This action cannot be undone and will permanently remove this custom voice from your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete Voice
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>
      <main>
        <Card className="overflow-hidden p-0 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-900">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-900 dark:bg-neutral-900">
            <div className="flex items-center gap-2">
              <Icons.play className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <h4 className="text-md font-semibold text-neutral-900 dark:text-neutral-50">
                Voice Preview
              </h4>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-neutral-900/50">
            <div className="flex items-center space-x-4">
              <Input
                type="text"
                value={textInput || getDefaultTextForVoice(voice)}
                onChange={(e) => onTextChange(voice.id, e.target.value)}
                className="flex-1"
                placeholder="Enter text to test this voice..."
              />
              <Button
                variant="primary"
                onClick={() => onPlay(voice)}
                className="h-8 w-8 p-0 rounded-full flex items-center justify-center"
                disabled={isPlaying}
              >
                {isPlaying ? (
                  <Icons.loading className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.play className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                This voice uses <strong>{capitalizeVoiceName(voice.openaiVoice)}</strong> as the base voice
                {voice.description && ' with your custom personality description'}.
              </p>
            </div>
          </div>
        </Card>
        
        {/* Voice Statistics */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Base Voice</p>
              <p className="text-lg font-semibold text-neutral-600 dark:text-neutral-400">
                {capitalizeVoiceName(voice.openaiVoice)}
              </p>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Status</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {voice.isDefault ? 'Default' : 'Active'}
              </p>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Created</p>
              <p className="text-lg font-semibold text-neutral-600 dark:text-neutral-400">
                {new Date(voice.addedOn).toLocaleDateString()}
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VoiceDetail; 