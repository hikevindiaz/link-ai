"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/Divider';
import { Input } from '@/components/Input';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { RiDeleteBinLine } from '@remixicon/react';

interface VoiceLabel {
  [key: string]: string;
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  [key: string]: any;
}

interface Voice {
  voice_id: string;
  name: string;
  labels: VoiceLabel;
  language?: string;
  sampleText?: string;
  settings?: VoiceSettings;
}

interface VoiceLibraryProps {
  voices: Voice[];
  searchTerm: string;
  visibleVoices: number;
  isLoading: boolean;
  showBanner: boolean;
  isPlaying: Record<string, boolean>;
  textInputs: Record<string, string>;
  isSaving: boolean;
  userVoices: Voice[];
  isMobileView: boolean;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadMore: () => void;
  onAddVoice: (voice: Voice) => void;
  onRemoveVoice: (voiceId: string) => void;
  onPlayVoice: (voice: Voice) => void;
  onTextChange: (voiceId: string, text: string) => void;
  onBannerClose: () => void;
  onBack: () => void;
  getDefaultTextForVoice: (voice: Voice) => string;
  isVoiceAddedToUser: (voiceId: string) => boolean;
  getImportantTags: (voice: Voice) => {key: string, value: string}[];
}

const VoiceLibrary = ({
  voices,
  searchTerm,
  visibleVoices,
  isLoading,
  showBanner,
  isPlaying,
  textInputs,
  isSaving,
  userVoices,
  isMobileView,
  onSearchChange,
  onLoadMore,
  onAddVoice,
  onRemoveVoice,
  onPlayVoice,
  onTextChange,
  onBannerClose,
  onBack,
  getDefaultTextForVoice,
  isVoiceAddedToUser,
  getImportantTags
}: VoiceLibraryProps) => {
  return (
    <div id="voice-library" className="p-4 sm:p-6 lg:p-8 border-t border-gray-200 dark:border-gray-800">
      {/* Mobile back button */}
      {isMobileView && (
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center text-gray-600 dark:text-gray-300 pl-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back to My Voices
          </Button>
        </div>
      )}
      
      {/* Banner */}
      {showBanner && (
        <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 px-6 py-2.5 sm:px-3.5 sm:before:flex-1 w-full mb-6 rounded-lg">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm/6 text-gray-900">
              <strong className="font-semibold">Voice Library</strong>
              <svg viewBox="0 0 2 2" aria-hidden="true" className="mx-2 inline h-0.5 w-0.5 fill-current">
                <circle r={1} cx={1} cy={1} />
              </svg>
              Customize your agents with premium AI voices
            </p>
          </div>
          <div className="flex flex-1 justify-end">
            <button
              type="button"
              className="-m-3 p-3 focus-visible:outline-offset-[-4px]"
              onClick={onBannerClose}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon aria-hidden="true" className="h-5 w-5 text-gray-900" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Voice Library</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Explore and test new voices for your agents
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search for voice..."
            id="search"
            name="search"
            type="search"
            value={searchTerm}
            onChange={onSearchChange}
            className="w-74 mt-2"
          />
        </div>
      </div>

      <Divider className="mb-6" />

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
          <span className="ml-2 text-sm text-gray-500">Loading voices...</span>
        </div>
      ) : voices.length === 0 ? (
        <div className="flex h-full items-center justify-center py-8 text-center">
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No voices available.
            </p>
          </div>
        </div>
      ) : (
        /* Grid List */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {voices.slice(0, visibleVoices).map((voice, index) => (
            <Card key={index} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{voice.name}</h2>
                  <div className="flex flex-row flex-wrap gap-1 mt-1">
                    {getImportantTags(voice).map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="default" className="text-xs px-2 py-0">
                        {tag.value}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button 
                  variant={isVoiceAddedToUser(voice.voice_id) ? "destructive" : "secondary"} 
                  size="sm"
                  onClick={() => isVoiceAddedToUser(voice.voice_id) 
                    ? onRemoveVoice(voice.voice_id) 
                    : onAddVoice(voice)
                  }
                  disabled={isSaving}
                >
                  {isVoiceAddedToUser(voice.voice_id) ? (
                    <>
                      <RiDeleteBinLine className="mr-1.5 h-4 w-4" />
                      Remove
                    </>
                  ) : (
                    '+ Add Voice'
                  )}
                </Button>
              </div>
              
              <div className="flex items-center space-x-4">
                <Input
                  type="text"
                  value={textInputs[voice.voice_id] || getDefaultTextForVoice(voice)}
                  onChange={(e) => onTextChange(voice.voice_id, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  onClick={() => onPlayVoice(voice)}
                  className="h-8 w-8 p-0 rounded-full flex items-center justify-center"
                  disabled={isPlaying[voice.voice_id]}
                >
                  {isPlaying[voice.voice_id] ? (
                    <Icons.loading className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!isLoading && voices.length > visibleVoices && (
        <div className="flex justify-center mt-6">
          <Button variant="primary" onClick={onLoadMore}>Load More</Button>
        </div>
      )}
    </div>
  );
};

export default VoiceLibrary; 