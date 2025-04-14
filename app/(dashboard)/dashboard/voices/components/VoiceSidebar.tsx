"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/Divider';
import { Icons } from '@/components/icons';
import { RiDeleteBinLine, RiSoundModuleLine } from '@remixicon/react';
import { cn } from '@/lib/utils';

interface VoiceLabel {
  [key: string]: string;
}

interface Voice {
  voice_id: string;
  name: string;
  labels: VoiceLabel;
  language?: string;
}

interface UserVoice extends Voice {
  id?: string;
  userId?: string;
  addedOn: string;
}

interface VoiceSidebarProps {
  userVoices: UserVoice[];
  selectedVoiceId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isMobileView: boolean;
  onVoiceSelect: (voice: UserVoice) => void;
  onRemoveVoice: (voiceId: string) => void;
  onBrowseLibrary: () => void;
}

const VoiceSidebar = ({
  userVoices,
  selectedVoiceId,
  isLoading,
  isSaving,
  isMobileView,
  onVoiceSelect,
  onRemoveVoice,
  onBrowseLibrary
}: VoiceSidebarProps) => {
  return (
    <div className={cn("border-r border-gray-200 dark:border-gray-800 flex flex-col", 
      isMobileView ? "w-full" : "w-80")}>
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            My Voices
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9"
              onClick={onBrowseLibrary}
              title="Add New Voice"
            >
              <Icons.add className="w-5 h-5" />
            </Button>
            {selectedVoiceId && !isMobileView && (
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9"
                onClick={() => onVoiceSelect(null as any)}
                title="Browse Voice Library"
              >
                <Icons.search className="w-6 h-6" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <Divider className="mt-4" />
      
      <div className="flex-1 overflow-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
            <span className="ml-2 text-sm text-gray-500">Loading voices...</span>
          </div>
        ) : userVoices.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 mt-1">
            {userVoices.map((voice) => (
              <Card 
                key={voice.voice_id}
                className={cn(
                  "group transition-all duration-200",
                  "hover:bg-gray-50 dark:hover:bg-gray-900",
                  "hover:shadow-sm",
                  "hover:border-gray-300 dark:hover:border-gray-700",
                  selectedVoiceId === voice.voice_id && [
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
                        selectedVoiceId === voice.voice_id && [
                          "border-2 border-indigo-500 dark:border-indigo-500",
                          "shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                        ]
                      )}
                      aria-hidden={true}
                    >
                      <RiSoundModuleLine className="h-5 w-5" />
                    </span>
                    <div className="truncate min-w-0">
                      <p className={cn(
                        "truncate text-sm font-medium text-gray-900 dark:text-gray-50",
                        selectedVoiceId === voice.voice_id && "text-indigo-600 dark:text-indigo-400"
                      )}>
                        <button 
                          onClick={() => onVoiceSelect(voice)}
                          className="focus:outline-none hover:no-underline no-underline"
                          type="button"
                        >
                          <span className="absolute inset-0" aria-hidden="true" />
                          {voice.name}
                        </button>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 pointer-events-none no-underline mt-0.5">
                        Added {new Date(voice.addedOn).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="absolute right-2.5 top-2.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveVoice(voice.voice_id);
                      }}
                      disabled={isSaving}
                    >
                      <RiDeleteBinLine className="h-3.5 w-3.5" />
                      <span className="sr-only">Remove voice</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center py-8 text-center">
            <div className="flex flex-col items-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <RiSoundModuleLine className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">
                No voices added yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Browse the voice library and add voices to your collection.
              </p>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={onBrowseLibrary}
                className="mt-1"
              >
                Browse Voices
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceSidebar; 