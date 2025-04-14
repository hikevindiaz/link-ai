"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/Input';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
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

interface UserVoice extends Voice {
  id?: string;
  userId?: string;
  addedOn: string;
}

interface VoiceDetailProps {
  voice: UserVoice;
  isPlaying: boolean;
  isSaving: boolean;
  textInput: string;
  onRemove: (voiceId: string) => void;
  onTextChange: (voiceId: string, text: string) => void;
  onPlay: (voice: Voice) => void;
  getImportantTags: (voice: Voice) => {key: string, value: string}[];
  getDefaultTextForVoice: (voice: Voice | UserVoice) => string;
}

const VoiceDetail = ({
  voice,
  isPlaying,
  isSaving,
  textInput,
  onRemove,
  onTextChange,
  onPlay,
  getImportantTags,
  getDefaultTextForVoice
}: VoiceDetailProps) => {
  return (
    <div className="p-6">
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {voice.name}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {getImportantTags(voice).map((tag, tagIndex) => (
                <Badge key={tagIndex} variant="default" className="text-xs px-2 py-0">
                  {tag.value}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => onRemove(voice.voice_id)}
            disabled={isSaving}
          >
            <RiDeleteBinLine className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
      </header>
      <main>
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Icons.play className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-50">
                Voice Preview
              </h4>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <div className="flex items-center space-x-4">
              <Input
                type="text"
                value={textInput || getDefaultTextForVoice(voice)}
                onChange={(e) => onTextChange(voice.voice_id, e.target.value)}
                className="flex-1"
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
          </div>
        </Card>
      </main>
    </div>
  );
};

export default VoiceDetail; 