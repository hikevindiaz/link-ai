"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from "lucide-react";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Import our new components
import EmptyState from './components/EmptyState';
import VoiceLibrary from './components/VoiceLibrary';
import VoiceDetail from './components/VoiceDetail';
import VoiceSidebar from './components/VoiceSidebar';

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
  
  // Mobile responsiveness state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showVoiceDetailsOnMobile, setShowVoiceDetailsOnMobile] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<{ src: string; id: string } | null>(null);
  
  // New state for controlling which view is active (library or empty state)
  const [showLibrary, setShowLibrary] = useState(false);

  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobileView();
    
    // Set up listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);
  
  // Update mobile view state when voice is selected
  useEffect(() => {
    if (selectedVoice && isMobileView) {
      setShowVoiceDetailsOnMobile(true);
    }
  }, [selectedVoice, isMobileView]);

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

  const handleVoiceClick = (voice: UserVoice) => {
    setSelectedVoice(voice);
    setShowVoiceDetailsOnMobile(true);
    setShowLibrary(false);
  };

  const handleBrowseLibrary = () => {
    setSelectedVoice(null);
    setShowLibrary(true);
    // Make sure we show the content area on mobile too
    if (isMobileView) {
      setShowVoiceDetailsOnMobile(true);
    }
  };
  
  const handleBackFromLibrary = () => {
    setShowLibrary(false);
    if (isMobileView) {
      setShowVoiceDetailsOnMobile(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - My Voices */}
      {(!isMobileView || (isMobileView && !showVoiceDetailsOnMobile)) && (
        <VoiceSidebar
          userVoices={userVoices}
          selectedVoiceId={selectedVoice?.voice_id || null}
          isLoading={isUserVoicesLoading}
          isSaving={isSaving}
          isMobileView={isMobileView}
          onVoiceSelect={handleVoiceClick}
          onRemoveVoice={removeVoiceFromUser}
          onBrowseLibrary={handleBrowseLibrary}
        />
      )}

      {/* Main Content */}
      {(!isMobileView || (isMobileView && (showVoiceDetailsOnMobile || showLibrary))) && (
        <div className="flex-1 overflow-auto">
          {isMobileView && showVoiceDetailsOnMobile && selectedVoice && (
            <div className="border-b border-gray-200 dark:border-gray-800 p-2">
              <Button
                variant="ghost"
                onClick={() => setShowVoiceDetailsOnMobile(false)}
                className="flex items-center text-gray-600 dark:text-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to voices
              </Button>
            </div>
          )}
          
          {selectedVoice ? (
            <VoiceDetail
              voice={selectedVoice}
              isPlaying={!!isPlaying[selectedVoice.voice_id]}
              isSaving={isSaving}
              textInput={textInputs[selectedVoice.voice_id] || ''}
              onRemove={removeVoiceFromUser}
              onTextChange={handleTextChange}
              onPlay={() => handlePlay(findOriginalVoice(selectedVoice))}
              getImportantTags={getImportantTags}
              getDefaultTextForVoice={(voice) => getDefaultTextForVoice(findOriginalVoice(voice))}
            />
          ) : showLibrary ? (
            <VoiceLibrary
              voices={filteredVoices}
              searchTerm={searchTerm}
              visibleVoices={visibleVoices}
              isLoading={isLoading}
              showBanner={showBanner}
              isPlaying={isPlaying}
              textInputs={textInputs}
              isSaving={isSaving}
              userVoices={userVoices}
              isMobileView={isMobileView}
              onSearchChange={handleSearchChange}
              onLoadMore={loadMoreVoices}
              onAddVoice={addVoiceToUser}
              onRemoveVoice={removeVoiceFromUser}
              onPlayVoice={handlePlay}
              onTextChange={handleTextChange}
              onBannerClose={() => setShowBanner(false)}
              onBack={handleBackFromLibrary}
              getDefaultTextForVoice={getDefaultTextForVoice}
              isVoiceAddedToUser={isVoiceAddedToUser}
              getImportantTags={getImportantTags}
            />
          ) : (
            <EmptyState
              userVoicesCount={userVoices.length}
              onBrowseClick={handleBrowseLibrary}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default VoicesPage;
