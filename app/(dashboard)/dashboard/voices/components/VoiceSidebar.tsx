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
      tags.push({ key: 'default', value: 'Default', color: 'indigo' });
    }
    
    if (voice.language) {
      tags.push({ key: 'language', value: voice.language, color: 'gray' });
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
    <div className={`flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col ${isMobileView ? 'w-full' : 'w-80'}`}>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">My Voices</h2>
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

      <div className="border-t border-gray-200 dark:border-gray-800 mt-4">
        <div className="flex-1 overflow-auto px-4 pt-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
              <span className="ml-2 text-sm text-gray-500">Loading voices...</span>
            </div>
          ) : userVoices.length === 0 ? (
            <div className="flex h-full items-center justify-center py-8 text-center">
              <div className="flex flex-col items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
            <div className="grid grid-cols-1 gap-3">
              {userVoices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                
                return (
                  <Card 
                    key={voice.id}
                    className={cn(
                      "group transition-all duration-200",
                      "hover:bg-gray-50 dark:hover:bg-gray-900",
                      "hover:shadow-sm",
                      "hover:border-gray-300 dark:hover:border-gray-700",
                      isSelected && [
                        "border-indigo-500 dark:border-indigo-500",
                        "bg-indigo-50/50 dark:bg-indigo-500/5",
                        "ring-1 ring-indigo-500/20 dark:ring-indigo-500/20"
                      ]
                    )}
                  >
                    <div className="relative px-3.5 py-2.5">
                      <div className="flex items-center space-x-3">
                        <span
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                            'bg-indigo-100 dark:bg-indigo-500/20',
                            'text-indigo-800 dark:text-indigo-500',
                            'transition-transform duration-200 group-hover:scale-[1.02]',
                            isSelected && [
                              "border-2 border-indigo-500 dark:border-indigo-500",
                              "shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                            ]
                          )}
                          aria-hidden={true}
                        >
                          <RiMicLine className="h-5 w-5" />
                        </span>
                        <div className="truncate min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={cn(
                              "truncate text-sm font-medium text-gray-900 dark:text-gray-50",
                              isSelected && "text-indigo-600 dark:text-indigo-400"
                            )}>
                              <button 
                                onClick={() => onVoiceSelect(voice)}
                                className="focus:outline-none hover:no-underline no-underline"
                                type="button"
                              >
                                <span className="absolute inset-0" aria-hidden="true" />
                                {capitalizeVoiceName(voice.name)}
                              </button>
                            </p>
                            <div className="ml-2">
                              {voice.isDefault && (
                                <Badge 
                                  className="text-[10px] px-1 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300"
                                >
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-500 pointer-events-none no-underline mt-0.5">
                            {capitalizeVoiceName(voice.openaiVoice)} {voice.language ? `• ${voice.language}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="absolute right-2.5 top-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <RiMoreFill className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
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
                  </Card>
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