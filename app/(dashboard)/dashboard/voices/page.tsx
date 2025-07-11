"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Divider } from '@/components/Divider';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Volume2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { RiAddLine } from '@remixicon/react';

// Types
interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
  languages: string[];
  gender: string;
  previewUrl?: string;
}

interface VoiceCategory {
  category: string;
  voices: ElevenLabsVoice[];
}

interface UserVoice {
  id: string;
  name: string;
  elevenLabsVoiceId: string;
  description?: string;
  language?: string;
  isDefault: boolean;
  addedOn: string;
}

const VoicesPage = () => {
  // User voices state
  const [userVoices, setUserVoices] = useState<UserVoice[]>([]);
  const [selectedUserVoice, setSelectedUserVoice] = useState<UserVoice | null>(null);
  const [isLoadingUserVoices, setIsLoadingUserVoices] = useState(true);

  // Voice library state
  const [voiceCategories, setVoiceCategories] = useState<VoiceCategory[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);

  // Test voice state
  const [testText, setTestText] = useState('Hello! This is a test of my voice.');
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [selectedVoiceForTest, setSelectedVoiceForTest] = useState<string | null>(null);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // UI state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [voiceToDelete, setVoiceToDelete] = useState<UserVoice | null>(null);

  // Check for mobile view
  useEffect(() => {
    const checkMobileView = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      setShowSidebar(!mobile); // Hide sidebar on mobile by default
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Load data
  useEffect(() => {
    loadUserVoices();
    loadVoiceCategories();
  }, []);

  const loadUserVoices = async () => {
    try {
      setIsLoadingUserVoices(true);
      const response = await fetch('/api/user/voices');
      if (!response.ok) {
        throw new Error('Failed to fetch user voices');
      }
      const data = await response.json();
      setUserVoices(data.voices || []);
    } catch (error) {
      console.error('Error loading user voices:', error);
      toast.error('Failed to load your voices');
      setUserVoices([]);
    } finally {
      setIsLoadingUserVoices(false);
    }
  };

  const loadVoiceCategories = async () => {
    try {
      setIsLoadingVoices(true);
      const response = await fetch('/api/elevenlabs/voices');
      if (!response.ok) {
        throw new Error('Failed to fetch voice library');
      }
      const data = await response.json();
      setVoiceCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading voice categories:', error);
      toast.error('Failed to load voice library');
      setVoiceCategories([]);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleTestVoice = async (voiceId: string, voiceName: string) => {
    if (!testText.trim()) {
      toast.error('Please enter some text to test');
      return;
    }

    setIsTestingVoice(true);
    setIsLoadingAudio(true);

    try {
      const response = await fetch('/api/elevenlabs/test-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          voiceId: voiceId,
          language: 'en', // You could make this dynamic based on voice
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Track current audio if this is the selected voice
      if (voiceId === selectedVoiceForTest) {
        setCurrentAudio(audio);
      }
      
      audio.onloadstart = () => {
        setIsLoadingAudio(false);
        setIsPlaying(prev => ({ ...prev, [voiceId]: true }));
      };
      
      audio.onended = () => {
        setIsPlaying(prev => ({ ...prev, [voiceId]: false }));
        if (voiceId === selectedVoiceForTest) {
          setCurrentAudio(null);
        }
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(prev => ({ ...prev, [voiceId]: false }));
        setIsLoadingAudio(false);
        if (voiceId === selectedVoiceForTest) {
          setCurrentAudio(null);
        }
        URL.revokeObjectURL(audioUrl);
        toast.error('Error playing audio');
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error testing voice:', error);
      setIsPlaying(prev => ({ ...prev, [voiceId]: false }));
      setIsLoadingAudio(false);
      if (voiceId === selectedVoiceForTest) {
        setCurrentAudio(null);
      }
      toast.error('Failed to test voice');
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleAddVoice = async (voice: ElevenLabsVoice) => {
    try {
      const response = await fetch('/api/user/voices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: voice.name,
          elevenLabsVoiceId: voice.id,
          description: voice.description,
          language: voice.languages[0] || 'en',
          isDefault: userVoices.length === 0, // Make first voice default
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add voice');
      }

      const data = await response.json();
      setUserVoices(prev => [data.voice, ...prev]);
      toast.success(`${voice.name} added to your voices!`);
    } catch (error) {
      console.error('Error adding voice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add voice');
    }
  };

  const handleDeleteClick = (voice: UserVoice) => {
    setVoiceToDelete(voice);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!voiceToDelete) return;

    try {
      const response = await fetch(`/api/user/voices/${voiceToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove voice');
      }

      setUserVoices(prev => prev.filter(voice => voice.id !== voiceToDelete.id));
      if (selectedUserVoice?.id === voiceToDelete.id) {
        setSelectedUserVoice(null);
      }
      toast.success('Voice removed from your collection');
    } catch (error) {
      console.error('Error removing voice:', error);
      toast.error('Failed to remove voice');
    } finally {
      setShowDeleteDialog(false);
      setVoiceToDelete(null);
    }
  };

  const isVoiceAdded = (voiceId: string) => {
    return userVoices.some(voice => voice.elevenLabsVoiceId === voiceId);
  };

  // Get all available voices for dropdown (deduplicated)
  const getAllVoices = () => {
    const voiceMap = new Map<string, { id: string; name: string; categories: string[] }>();
    
    voiceCategories.forEach(category => {
      category.voices.forEach(voice => {
        if (voiceMap.has(voice.id)) {
          // Add category to existing voice
          voiceMap.get(voice.id)!.categories.push(category.category);
        } else {
          // Add new voice
          voiceMap.set(voice.id, {
            id: voice.id,
            name: voice.name,
            categories: [category.category]
          });
        }
      });
    });
    
    return Array.from(voiceMap.values());
  };

  // Handle test voice from header
  const handleTestSelectedVoice = async () => {
    if (!selectedVoiceForTest) {
      toast.error('Please select a voice first');
      return;
    }

    // If audio is currently playing for this voice, stop it
    if (isPlaying[selectedVoiceForTest] && currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(prev => ({ ...prev, [selectedVoiceForTest]: false }));
      setIsLoadingAudio(false);
      return;
    }

    // Otherwise, start playing if text is available
    if (!testText.trim()) {
      toast.error('Please enter text to test');
      return;
    }

    const allVoices = getAllVoices();
    const selectedVoice = allVoices.find(v => v.id === selectedVoiceForTest);
    if (!selectedVoice) return;

    await handleTestVoice(selectedVoiceForTest, selectedVoice.name);
  };

  // Generate customer service text using AI
  const handleGenerateText = async () => {
    if (!selectedVoiceForTest) {
      toast.error('Please select a voice first');
      return;
    }

    setIsGeneratingText(true);

    try {
      const allVoices = getAllVoices();
      const selectedVoice = allVoices.find(v => v.id === selectedVoiceForTest);
      
      if (!selectedVoice) {
        toast.error('Selected voice not found');
        return;
      }

      // Find the voice details from categories
      let voiceDetails: ElevenLabsVoice | undefined;
      for (const category of voiceCategories) {
        voiceDetails = category.voices.find(v => v.id === selectedVoiceForTest);
        if (voiceDetails) break;
      }

      if (!voiceDetails) {
        toast.error('Voice details not found');
        return;
      }

      const response = await fetch('/api/ai/generate-test-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceName: voiceDetails.name,
          voiceDescription: voiceDetails.description,
          language: voiceDetails.languages.join(', '),
          gender: voiceDetails.gender,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate text');
      }

      const data = await response.json();
      setTestText(data.text);
      toast.success('Generated customer service text!');
    } catch (error) {
      console.error('Error generating text:', error);
      toast.error('Failed to generate text');
    } finally {
      setIsGeneratingText(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - User's Voices */}
      {(!isMobileView || showSidebar) && (
        <div className={cn("border-r border-neutral-200 dark:border-neutral-800 flex flex-col", 
          isMobileView ? "w-full" : "w-80")}>
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                My Voices
              </h2>
              {isMobileView ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              ) : (
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  {userVoices.length} voice{userVoices.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
          
          <Divider className="mt-4" />
          
          <div className="flex-1 overflow-auto px-4 pb-4">
            {isLoadingUserVoices ? (
              <UserVoicesSkeleton />
            ) : userVoices.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6">
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-900">
                    <Volume2 className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                    No voices yet
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Add voices from the library to get started with voice synthesis.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 mt-1">
                {userVoices.map((voice) => (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedUserVoice(voice)}
                    className={cn(
                      "group transition-all duration-200 cursor-pointer p-3 rounded-xl border relative",
                      "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                      "hover:shadow-sm",
                      "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
                      "hover:border-neutral-300 dark:hover:border-neutral-700",
                      selectedUserVoice?.id === voice.id && [
                        "border-neutral-400 dark:border-white",
                        "bg-neutral-50 dark:bg-neutral-900"
                      ]
                    )}
                  >
                    <div className="flex items-center">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                        <Volume2 className="h-4 w-4" />
                      </span>
                      <div className="ml-3 w-full overflow-hidden">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center max-w-[70%]">
                            <div className="truncate text-sm font-semibold text-black dark:text-white">
                              {voice.name}
                            </div>
                            {voice.isDefault && (
                              <div className="ml-2 flex-shrink-0">
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
                          {voice.description || 'No description'}
                        </p>
                      </div>
                    </div>

                    <div className="absolute right-2 top-2">
                      <Button
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(voice);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Voice Library */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Test Interface */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-black dark:text-white">
                Voice Library
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Choose from our collection of high-quality voices
              </p>
            </div>
            {isMobileView && !showSidebar && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSidebar(true)}
              >
                My Voices ({userVoices.length})
              </Button>
            )}
            </div>

          {/* Test Interface */}
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Sparkles 
                onClick={handleGenerateText}
                className={cn(
                  "absolute left-3 top-1/2 transform -translate-y-1/2 z-20 h-4 w-4 transition-all cursor-pointer",
                  selectedVoiceForTest 
                    ? "text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 hover:scale-110" 
                    : "text-neutral-400 dark:text-neutral-600 cursor-not-allowed",
                  isGeneratingText && "animate-spin"
                )} 
              />
              <Input
                placeholder="Enter text to test voices..."
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full pl-11"
                disabled={isGeneratingText}
              />
            </div>
            <div className="min-w-[200px]">
              <Select
                value={selectedVoiceForTest || ""}
                onValueChange={(value) => setSelectedVoiceForTest(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a voice">
                    {selectedVoiceForTest && (
                      getAllVoices().find(v => v.id === selectedVoiceForTest)?.name
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {getAllVoices().map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex items-center">
                        <span className="font-medium">{voice.name}</span>
                        <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                          {voice.categories.join(', ')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={!testText.trim() || !selectedVoiceForTest}
              onClick={handleTestSelectedVoice}
                              className="h-10 w-10 p-0 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:bg-neutral-300 dark:disabled:bg-neutral-600"
            >
              {isLoadingAudio ? (
                <Loader2 className="h-4 w-4 text-white dark:text-black animate-spin" />
              ) : selectedVoiceForTest && isPlaying[selectedVoiceForTest] ? (
                <Pause className="h-4 w-4 text-white dark:text-black" />
              ) : (
                <Play className="h-4 w-4 text-white dark:text-black" />
              )}
            </Button>
          </div>
        </div>

        {/* Voice Categories */}
        <div className="flex-1 overflow-auto p-6">
          {isLoadingVoices ? (
            <VoiceLibrarySkeleton />
          ) : voiceCategories.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-900">
                  <Volume2 className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </div>
                <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                  Voice library unavailable
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Unable to load the voice library. Please try again later.
                </p>
                <Button 
                  className="mt-6" 
                  onClick={loadVoiceCategories}
                  variant="secondary"
                >
                  <RiAddLine className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {voiceCategories.map((category, categoryIndex) => (
                <VoiceCategorySection
                  key={category.category}
                  category={category}
                  categoryIndex={categoryIndex}
                  testText={testText}
                  isPlaying={isPlaying}
                  onTestVoice={handleTestVoice}
                  onAddVoice={handleAddVoice}
                  isVoiceAdded={isVoiceAdded}
                  selectedVoiceForTest={selectedVoiceForTest}
                  onSelectVoiceForTest={setSelectedVoiceForTest}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{voiceToDelete?.name}" from your voice collection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Voice Category Section Component
const VoiceCategorySection = ({
  category,
  categoryIndex,
  testText,
  isPlaying,
  onTestVoice,
  onAddVoice,
  isVoiceAdded,
  selectedVoiceForTest,
  onSelectVoiceForTest,
}: {
  category: VoiceCategory;
  categoryIndex: number;
  testText: string;
  isPlaying: Record<string, boolean>;
  onTestVoice: (voiceId: string, voiceName: string) => void;
  onAddVoice: (voice: ElevenLabsVoice) => void;
  isVoiceAdded: (voiceId: string) => boolean;
  selectedVoiceForTest: string | null;
  onSelectVoiceForTest: (voiceId: string | null) => void;
}) => {
  return (
    <div className="space-y-4">
      {/* Bold Category Title */}
      <h2 className="text-lg font-semibold text-black dark:text-white">
        {category.category}
      </h2>

      {/* Horizontally Scrollable Container */}
      <div 
        className="overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE and Edge */
          scrollBehavior: 'smooth'
        }}
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY;
        }}
      >
        <div className="flex gap-4 w-max">
          {category.voices.map((voice, index) => (
            <VoiceCard
              key={`${category.category}-${voice.id}`}
              voice={voice}
              testText={testText}
              isPlaying={isPlaying[voice.id] || false}
              onTestVoice={onTestVoice}
              onAddVoice={onAddVoice}
              isAdded={isVoiceAdded(voice.id)}
              index={index}
              categoryIndex={categoryIndex}
              isSelected={selectedVoiceForTest === voice.id}
              onSelect={() => onSelectVoiceForTest(voice.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Voice Card Component
const VoiceCard = ({
  voice,
  testText,
  isPlaying,
  onTestVoice,
  onAddVoice,
  isAdded,
  index = 0,
  categoryIndex = 0,
  isSelected = false,
  onSelect,
}: {
  voice: ElevenLabsVoice;
  testText: string;
  isPlaying: boolean;
  onTestVoice: (voiceId: string, voiceName: string) => void;
  onAddVoice: (voice: ElevenLabsVoice) => void;
  isAdded: boolean;
  index?: number;
  categoryIndex?: number;
  isSelected?: boolean;
  onSelect?: () => void;
}) => {
  const getAvatarLetter = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getLanguageDisplay = (languages: string[]) => {
    if (languages.includes('en') || languages.includes('english')) return 'English';
    if (languages.includes('es') || languages.includes('spanish')) return 'Spanish';
    return languages[0] || 'English';
  };

  const getGenderDisplay = (gender: string) => {
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  // Color variations for cards - muted system colors
  const getCardColors = (index: number) => {
    const colors = [
      // Neutral (muted)
      {
        bg: 'dark:bg-neutral-400/5',
        bgLight: 'bg-neutral-100/50',
        border: 'border-neutral-200/60 dark:border-neutral-500/20',
        hoverBorder: 'hover:border-neutral-400/30 dark:hover:border-neutral-400/40',
        selectedBorder: 'border border-neutral-400 dark:border-neutral-400',
        avatar: 'bg-neutral-400',
        avatarText: 'text-white',
        button: 'bg-neutral-400 hover:bg-neutral-500 text-white',
        badges: 'bg-neutral-400 text-white'
      },
      // Blue (muted)
      {
        bg: 'dark:bg-blue-400/5',
        bgLight: 'bg-blue-100/40',
        border: 'border-blue-200/60 dark:border-blue-500/20',
        hoverBorder: 'hover:border-blue-400/30 dark:hover:border-blue-400/40',
        selectedBorder: 'border border-blue-500 dark:border-blue-500',
        avatar: 'bg-blue-500',
        avatarText: 'text-white',
        button: 'bg-blue-500 hover:bg-blue-600 text-white',
        badges: 'bg-blue-500 text-white'
      },
      // Emerald (muted)
      {
        bg: 'dark:bg-emerald-400/5',
        bgLight: 'bg-emerald-100/40',
        border: 'border-emerald-200/60 dark:border-emerald-500/20',
        hoverBorder: 'hover:border-emerald-400/30 dark:hover:border-emerald-400/40',
        selectedBorder: 'border border-emerald-500 dark:border-emerald-500',
        avatar: 'bg-emerald-500',
        avatarText: 'text-white',
        button: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        badges: 'bg-emerald-500 text-white'
      },
      // Yellow (muted - using amber for better contrast)
      {
        bg: 'dark:bg-amber-400/5',
        bgLight: 'bg-amber-100/30',
        border: 'border-amber-200/50 dark:border-amber-500/20',
        hoverBorder: 'hover:border-amber-400/30 dark:hover:border-amber-400/40',
        selectedBorder: 'border border-amber-600 dark:border-amber-600',
        avatar: 'bg-amber-600',
        avatarText: 'text-white',
        button: 'bg-amber-600 hover:bg-amber-700 text-white',
        badges: 'bg-amber-600 text-white'
      },
      // Red (muted)
      {
        bg: 'dark:bg-red-400/5',
        bgLight: 'bg-red-100/40',
        border: 'border-red-200/60 dark:border-red-500/20',
        hoverBorder: 'hover:border-red-400/30 dark:hover:border-red-400/40',
        selectedBorder: 'border border-red-500 dark:border-red-500',
        avatar: 'bg-red-500',
        avatarText: 'text-white',
        button: 'bg-red-500 hover:bg-red-600 text-white',
        badges: 'bg-red-500 text-white'
      },
      // Purple (muted)
      {
        bg: 'dark:bg-purple-400/5',
        bgLight: 'bg-purple-100/40',
        border: 'border-purple-200/60 dark:border-purple-500/20',
        hoverBorder: 'hover:border-purple-400/30 dark:hover:border-purple-400/40',
        selectedBorder: 'border border-purple-500 dark:border-purple-500',
        avatar: 'bg-purple-500',
        avatarText: 'text-white',
        button: 'bg-purple-500 hover:bg-purple-600 text-white',
        badges: 'bg-purple-500 text-white'
      }
    ];
    return colors[index % colors.length];
  };

  // Get sequential colors for this voice, offset by category
  const colors = getCardColors((categoryIndex + index) % 6);

  return (
    <div 
      className={cn(
        "flex-none w-80 p-3 border rounded-2xl transition-all duration-200 group cursor-pointer",
        colors.bgLight,
        colors.bg,
        isSelected 
          ? colors.selectedBorder 
          : colors.border,
        !isSelected && colors.hoverBorder
      )}
      onClick={onSelect}
    >
      {/* Horizontal Layout: Avatar | Content | Actions */}
      <div className="flex items-center gap-3">
        {/* Left Column: Avatar */}
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
          colors.avatar,
          colors.avatarText
        )}>
          <span className="text-lg font-semibold">
            {getAvatarLetter(voice.name)}
          </span>
        </div>

        {/* Middle Column: Name & Description */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1 truncate">
            {voice.name}
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed cursor-help">
                  {voice.description.length > 13 ? `${voice.description.substring(0, 13)}...` : voice.description}
                </p>
              </TooltipTrigger>
              {voice.description.length > 13 && (
                <TooltipContent>
                  <p className="max-w-xs">{voice.description}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Right Column: Badges & Button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Badges Row */}
          <div className="flex gap-1">
            <Badge 
              variant="secondary" 
              className={cn(
                "px-2 py-0.5 rounded-full border-0 font-medium text-xs",
                colors.badges
              )}
            >
              {getLanguageDisplay(voice.languages)}
            </Badge>
            <Badge 
              variant="secondary" 
              className={cn(
                "px-2 py-0.5 rounded-full border-0 font-medium text-xs",
                colors.badges
              )}
            >
              {getGenderDisplay(voice.gender)}
            </Badge>
          </div>

          {/* Add Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAddVoice(voice);
            }}
            disabled={isAdded}
            size="sm"
            variant="ghost"
            className={cn(
              "h-6 w-6 p-0 rounded-xl shrink-0 transition-all",
              isAdded 
                ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" 
                : colors.button,
              !isAdded && "text-white"
            )}
          >
            {isAdded ? (
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Voice Library Skeleton Component
const VoiceLibrarySkeleton = () => (
  <div className="space-y-8">
    {Array.from({ length: 3 }).map((_, categoryIndex) => (
      <div key={categoryIndex} className="space-y-4">
        {/* Category title skeleton */}
        <Skeleton className="h-6 w-48 bg-neutral-200 dark:bg-neutral-700" />
        
        {/* Voice cards skeleton - horizontal scrollable */}
        <div 
          className="overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="flex gap-4 w-max">
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div key={cardIndex} className="flex-none w-80 p-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50 dark:bg-neutral-800">
                {/* Horizontal Layout: Avatar | Content | Actions */}
                <div className="flex items-center gap-3">
                  {/* Left Column: Avatar */}
                  <Skeleton className="h-12 w-12 rounded-2xl bg-neutral-200 dark:bg-neutral-700" />
                  
                  {/* Middle Column: Name & Description */}
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-20 mb-1 bg-neutral-200 dark:bg-neutral-700" />
                    <Skeleton className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                  
                  {/* Right Column: Badges & Button */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Badges Row */}
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                      <Skeleton className="h-5 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                    {/* Add Button */}
                    <Skeleton className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const UserVoicesSkeleton = () => (
  <div className="grid grid-cols-1 gap-2 mt-1">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="p-3 rounded-xl border bg-white dark:bg-black border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center">
          <Skeleton className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          <div className="ml-3 w-full">
            <div className="flex justify-between items-center mb-1">
              <Skeleton className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700" />
              <Skeleton className="h-4 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>
            <Skeleton className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default VoicesPage;
