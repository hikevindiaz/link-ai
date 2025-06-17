"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { RiDeleteBinLine, RiAddLine, RiMoreFill, RiMicLine } from '@remixicon/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuIconWrapper,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface CustomVoice {
  id: string;
  name: string;
  openaiVoice: string;
  description?: string;
  language?: string;
  isDefault: boolean;
  addedOn: string;
}

interface VoiceSidebarProps {
  userVoices: CustomVoice[];
  selectedVoiceId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isMobileView: boolean;
  onVoiceSelect: (voice: CustomVoice) => void;
  onRemoveVoice: (voiceId: string) => void;
  onCreateVoice: () => void;
}

const VoiceSidebar = ({
  userVoices,
  selectedVoiceId,
  isLoading,
  isSaving,
  isMobileView,
  onVoiceSelect,
  onRemoveVoice,
  onCreateVoice
}: VoiceSidebarProps) => {
  // Utility function to capitalize voice names properly
  const capitalizeVoiceName = (name: string): string => {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const getVoiceDisplayInfo = (voice: CustomVoice) => {
    const tags = [];
    
    if (voice.isDefault) {
      tags.push({ key: 'default', value: 'Default', color: 'neutral' });
    }
    
    if (voice.language) {
      tags.push({ key: 'language', value: voice.language, color: 'neutral' });
    }
    
    // Show the base OpenAI voice
    tags.push({ key: 'base', value: voice.openaiVoice, color: 'blue' });
    
    return tags;
  };

  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [selectedVoiceIdToDelete, setSelectedVoiceIdToDelete] = useState<string | null>(null);

  const handleDelete = (voiceId: string) => {
    setSelectedVoiceIdToDelete(voiceId);
    setIsDeleteConfirmationOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedVoiceIdToDelete) {
      onRemoveVoice(selectedVoiceIdToDelete);
      setSelectedVoiceIdToDelete(null);
      setIsDeleteConfirmationOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setSelectedVoiceIdToDelete(null);
    setIsDeleteConfirmationOpen(false);
  };

  return (
    <div className={`flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex flex-col ${isMobileView ? 'w-full' : 'w-80'}`}>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">My Voices</h2>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={onCreateVoice}
            disabled={isSaving}
          >
            <RiAddLine className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800 mt-4">
        <div className="flex-1 overflow-auto px-4 pt-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"></div>
              <span className="ml-2 text-sm text-neutral-500">Loading voices...</span>
            </div>
          ) : userVoices.length === 0 ? (
            <div className="flex h-full items-center justify-center py-8 text-center">
              <div className="flex flex-col items-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No custom voices yet.
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={onCreateVoice}
                >
                  <RiAddLine className="mr-2 h-4 w-4" />
                  Create Your First Voice
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {userVoices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                
                return (
                  <div 
                    key={voice.id}
                    onClick={() => onVoiceSelect(voice)}
                    className={cn(
                      "group transition-all duration-200 cursor-pointer p-3 rounded-xl border relative",
                      "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                      "hover:shadow-sm",
                      "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
                      "hover:border-neutral-300 dark:hover:border-neutral-700",
                      isSelected && [
                        "border-neutral-400 dark:border-white",
                        "bg-neutral-50 dark:bg-neutral-900"
                      ]
                    )}
                  >
                    <div className="flex items-center">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                        <RiMicLine className="h-4 w-4" />
                      </span>
                      <div className="ml-3 w-full overflow-hidden">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center max-w-[70%]">
                            <div className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
                              {capitalizeVoiceName(voice.name)}
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              {voice.isDefault && (
                                <Badge 
                                  className="text-[10px] px-1 py-0.5 bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                                >
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
                          {capitalizeVoiceName(voice.openaiVoice)} {voice.language ? `• ${voice.language}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="absolute right-2 top-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <RiMoreFill className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-56">
                          <DropdownMenuLabel>Voice Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuGroup>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(voice.id);
                              }}
                              className="text-red-600 dark:text-red-400"
                            >
                              <span className="flex items-center gap-x-2">
                                <DropdownMenuIconWrapper>
                                  <RiDeleteBinLine className="size-4 text-inherit" />
                                </DropdownMenuIconWrapper>
                                <span>Delete</span>
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the voice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VoiceSidebar; 