"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/Divider';
import { Input } from '@/components/Input';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { RiDeleteBinLine, RiSoundModuleLine } from '@remixicon/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Define types for the voice data
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

// Sample text options by language
const SampleTextOptions = {
  en: [
    "Hello, how can I assist you today?",
    "Welcome! I'm your virtual assistant.",
    "Hi there! What can I help you with?",
    "Thank you for reaching out. How may I help?"
  ],
  es: [
    "¡Hola! ¿Cómo puedo ayudarte hoy?",
    "¡Bienvenido! Soy tu asistente virtual.",
    "¿En qué puedo servirte?",
    "Gracias por contactarme. ¿En qué puedo ayudarte?"
  ],
  default: "Hello, how can I help you today?"
};

const VoicesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
  const [voices, setVoices] = useState<Voice[]>([]);
  const [visibleVoices, setVisibleVoices] = useState(15);
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [showBanner, setShowBanner] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserVoicesLoading, setIsUserVoicesLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<UserVoice | null>(null);
  const [userVoices, setUserVoices] = useState<UserVoice[]>([]);

  // Default voice settings if none available
  const defaultSettings: VoiceSettings = {
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true
  };

  useEffect(() => {
    const loadVoices = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/elevenlabs/voices');
        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }
        const data = await response.json();
        console.log('Loaded voices:', data);
        // Ensure data is an array before setting it
        setVoices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading voices:', error);
        setVoices([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadVoices();

    // Load user voices from API
    loadUserVoices();
  }, []);

  // Load user's voices from the API with localStorage fallback
  const loadUserVoices = async () => {
    try {
      setIsUserVoicesLoading(true);
      
      // Try to fetch from API first
      try {
        const response = await fetch('/api/user/voices');
        if (response.ok) {
          const data = await response.json();
          console.log("Loaded voices from API:", data);
          setUserVoices(data.voices || []);
          return;
        }
      } catch (apiError) {
        console.error('Error loading voices from API, falling back to localStorage:', apiError);
      }
      
      // Fallback to localStorage if API fails
      const savedVoices = localStorage.getItem('userVoices');
      if (savedVoices) {
        setUserVoices(JSON.parse(savedVoices));
      }
    } catch (error) {
      console.error('Error loading user voices:', error);
    } finally {
      setIsUserVoicesLoading(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const getDefaultTextForVoice = (voice: Voice): string => {
    // First try to use the sample text from the voice
    if (voice.sampleText) {
      return voice.sampleText;
    }
    
    // Check for Spanish language
    let isSpanish = false;
    
    // Check in language field
    if (voice.language === 'es' || 
        (voice.language && 
         (voice.language.toLowerCase().includes('spanish') || 
          voice.language.toLowerCase().includes('español')))) {
      isSpanish = true;
    }
    
    // Check in labels
    if (!isSpanish && voice.labels) {
      const labelValues = Object.values(voice.labels);
      for (const value of labelValues) {
        if (typeof value === 'string' && 
            (value.toLowerCase().includes('spanish') || 
             value.toLowerCase().includes('español') ||
             value.toLowerCase().includes('latino') ||
             value.toLowerCase().includes('latina') ||
             value.toLowerCase().includes('mexican'))) {
          isSpanish = true;
          break;
        }
      }
    }
    
    // Return random sample text based on detected language
    if (isSpanish) {
      const randomIndex = Math.floor(Math.random() * SampleTextOptions.es.length);
      return SampleTextOptions.es[randomIndex];
    } else {
      const randomIndex = Math.floor(Math.random() * SampleTextOptions.en.length);
      return SampleTextOptions.en[randomIndex];
    }
  };

  const handleTextChange = (voiceId: string, text: string) => {
    setTextInputs((prev) => ({ ...prev, [voiceId]: text }));
  };

  const handlePlay = async (voice: Voice) => {
    const voiceId = voice.voice_id;
    const text = textInputs[voiceId] || getDefaultTextForVoice(voice);
    setIsPlaying((prev) => ({ ...prev, [voiceId]: true }));

    try {
      // Use voice settings from ElevenLabs if available
      const settings = voice.settings || defaultSettings;
      
      const response = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          voiceId, 
          ...settings
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlaying((prev) => ({ ...prev, [voiceId]: false }));
        URL.revokeObjectURL(audioUrl); // Clean up the URL object
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying((prev) => ({ ...prev, [voiceId]: false }));
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying((prev) => ({ ...prev, [voiceId]: false }));
    }
  };

  const loadMoreVoices = () => {
    setVisibleVoices((prev) => prev + 15);
  };

  const tagMapping: Record<string, string[]> = {
    es: ['español', 'spanish'],
    // Add more mappings as needed
  };

  // Add a safeguard to ensure voices is an array before filtering
  const filteredVoices = Array.isArray(voices) ? voices.filter((voice) => {
    if (!voice || typeof voice !== 'object') return false;
    
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = voice.name && typeof voice.name === 'string' 
      ? voice.name.toLowerCase().includes(searchLower) 
      : false;
    
    const labelMatch = voice.labels && typeof voice.labels === 'object'
      ? Object.entries(voice.labels).some(([key, value]) => {
          if (typeof value !== 'string') return false;
          const labelLower = value.toLowerCase();
          return (
            labelLower.includes(searchLower) ||
            (tagMapping[key] && tagMapping[key].some((term) => term.includes(searchLower)))
          );
        })
      : false;
      
    return nameMatch || labelMatch;
  }) : [];

  const addVoiceToUser = async (voice: Voice) => {
    // Check if voice is already added
    if (userVoices.some(v => v.voice_id === voice.voice_id)) {
      toast.error('This voice is already in your collection');
      return;
    }

    setIsSaving(true);

    try {
      const userVoice: UserVoice = {
        ...voice,
        addedOn: new Date().toISOString()
      };
      
      // Try to save to API first
      try {
        const response = await fetch('/api/user/voices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voice }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Voice added to API:", data);
          
          // Reload voices from the API to get the correct DB ID
          loadUserVoices();
          toast.success(`Added ${voice.name} to your voices`);
          return;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add voice to database');
        }
      } catch (apiError) {
        console.error('Error adding voice to API, using localStorage as fallback:', apiError);
      }
      
      // Fallback to localStorage if API fails
      const updatedUserVoices = [...userVoices, userVoice];
      setUserVoices(updatedUserVoices);
      localStorage.setItem('userVoices', JSON.stringify(updatedUserVoices));
      
      toast.success(`Added ${voice.name} to your voices`);
    } catch (error) {
      console.error('Error adding voice:', error);
      toast.error('Failed to add voice');
    } finally {
      setIsSaving(false);
    }
  };

  const removeVoiceFromUser = async (voiceId: string) => {
    setIsSaving(true);
    
    try {
      // Try to delete from API first
      try {
        const response = await fetch(`/api/user/voices/${voiceId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          console.log("Voice removed from API:", voiceId);
          
          // Update local state
          const updatedUserVoices = userVoices.filter(voice => voice.voice_id !== voiceId);
          setUserVoices(updatedUserVoices);
          
          // Clear selected voice if it's the one being removed
          if (selectedVoice?.voice_id === voiceId) {
            setSelectedVoice(null);
          }
          
          toast.success('Voice removed from your collection');
          return;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove voice from database');
        }
      } catch (apiError) {
        console.error('Error removing voice from API, using localStorage fallback:', apiError);
      }
      
      // Fallback to localStorage if API fails
      const updatedUserVoices = userVoices.filter(voice => voice.voice_id !== voiceId);
      setUserVoices(updatedUserVoices);
      localStorage.setItem('userVoices', JSON.stringify(updatedUserVoices));
      
      // Clear selected voice if it's the one being removed
      if (selectedVoice?.voice_id === voiceId) {
        setSelectedVoice(null);
      }
      
      toast.success('Voice removed from your collection');
    } catch (error) {
      console.error('Error removing voice:', error);
      toast.error('Failed to remove voice');
    } finally {
      setIsSaving(false);
    }
  };

  const isVoiceAddedToUser = (voiceId: string) => {
    return userVoices.some(voice => voice.voice_id === voiceId);
  };

  // Find the original voice data with settings from our list
  const findOriginalVoice = (userVoice: UserVoice): Voice => {
    return voices.find(v => v.voice_id === userVoice.voice_id) || userVoice;
  };

  // Update the filtered categories to prioritize important tags
  const getImportantTags = (voice: Voice) => {
    const tags: {key: string, value: string}[] = [];
    
    // Add language tag with proper formatting
    if (voice.language) {
      // Map language codes to full names
      const languageMap: Record<string, string> = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'pl': 'Polish',
        'hi': 'Hindi',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese'
      };
      
      const languageName = languageMap[voice.language.toLowerCase()] || voice.language.toUpperCase();
      tags.push({key: 'language', value: languageName});
    }
    
    // Extract gender from labels
    if (voice.labels) {
      // Check for gender
      const genderLabels = Object.entries(voice.labels).filter(([key, value]) => {
        const valueLower = String(value).toLowerCase();
        return key === 'gender' || 
               valueLower.includes('male') || 
               valueLower.includes('female') || 
               valueLower.includes('non-binary');
      });
      
      if (genderLabels.length > 0) {
        tags.push({key: 'gender', value: String(genderLabels[0][1])});
      }
      
      // Check for accent
      const accentLabels = Object.entries(voice.labels).filter(([key, value]) => {
        const valueLower = String(value).toLowerCase();
        return key === 'accent' || 
               valueLower.includes('accent') || 
               valueLower.includes('american') || 
               valueLower.includes('british') ||
               valueLower.includes('australian') ||
               valueLower.includes('indian') ||
               valueLower.includes('mexican') ||
               valueLower.includes('spanish');
      });
      
      if (accentLabels.length > 0) {
        tags.push({key: 'accent', value: String(accentLabels[0][1])});
      }
    }
    
    return tags;
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - My Voices */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              My Voices
            </h2>
            <div className="flex items-center space-x-2">
              {selectedVoice && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setSelectedVoice(null)}
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
          {isUserVoicesLoading ? (
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
                    selectedVoice?.voice_id === voice.voice_id && [
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
                          selectedVoice?.voice_id === voice.voice_id && [
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
                          selectedVoice?.voice_id === voice.voice_id && "text-indigo-600 dark:text-indigo-400"
                        )}>
                          <button 
                            onClick={() => setSelectedVoice(voice)}
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
                          removeVoiceFromUser(voice.voice_id);
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
                  onClick={() => setSelectedVoice(null)}
                  className="mt-1"
                >
                  Browse Voices
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {selectedVoice ? (
          <div className="p-6">
            <header className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-4">
              <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {selectedVoice.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getImportantTags(selectedVoice).map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="default" className="text-xs px-2 py-0">
                        {tag.value}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => removeVoiceFromUser(selectedVoice.voice_id)}
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
                      value={textInputs[selectedVoice.voice_id] || getDefaultTextForVoice(findOriginalVoice(selectedVoice))}
                      onChange={(e) => handleTextChange(selectedVoice.voice_id, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="primary"
                      onClick={() => handlePlay(findOriginalVoice(selectedVoice))}
                      className="h-8 w-8 p-0 rounded-full flex items-center justify-center"
                      disabled={isPlaying[selectedVoice.voice_id]}
                    >
                      {isPlaying[selectedVoice.voice_id] ? (
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
        ) : (
          <>
            {/* Empty state */}
            <div className="flex h-full flex-col items-center justify-center p-6">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                  <RiSoundModuleLine className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {userVoices.length > 0 
                    ? 'Select a Voice' 
                    : 'Welcome to Voice Library'}
                </h1>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {userVoices.length > 0 
                    ? 'Select a voice from the sidebar or browse the library below to add more voices to your collection.' 
                    : 'Browse our premium AI voices to enhance your agents with natural-sounding speech.'}
                </p>
                <Button 
                  className="mt-6" 
                  onClick={() => {
                    const voicesSection = document.getElementById('voice-library');
                    if (voicesSection) {
                      voicesSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <RiSoundModuleLine className="mr-2 h-4 w-4" />
                  Browse Voice Library
                </Button>
              </div>
            </div>

            {/* Voice Library Section */}
            <div id="voice-library" className="p-4 sm:p-6 lg:p-8 border-t border-gray-200 dark:border-gray-800">
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
              onClick={() => setShowBanner(false)}
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
              onChange={handleSearchChange}
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
            {filteredVoices.slice(0, visibleVoices).map((voice, index) => (
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
                            ? removeVoiceFromUser(voice.voice_id) 
                            : addVoiceToUser(voice)
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
                    onChange={(e) => handleTextChange(voice.voice_id, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="primary"
                          onClick={() => handlePlay(voice)}
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
        {!isLoading && filteredVoices.length > visibleVoices && (
          <div className="flex justify-center mt-6">
            <Button variant="primary" onClick={loadMoreVoices}>Load More</Button>
          </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VoicesPage;
