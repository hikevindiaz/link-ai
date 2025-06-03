"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from "lucide-react";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Import our components
import EmptyState from './components/EmptyState';
import VoiceDetail from './components/VoiceDetail';
import VoiceSidebar from './components/VoiceSidebar';
import VoiceCreator from './components/VoiceCreator';

// Define types for the new voice system
interface CustomVoice {
  id: string;
  name: string;
  openaiVoice: string;
  description?: string;
  language?: string;
  isDefault: boolean;
  addedOn: string;
}

const VoicesPage = () => {
  // Utility function to capitalize voice names properly
  const capitalizeVoiceName = (name: string): string => {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const [voices, setVoices] = useState<CustomVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<CustomVoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testText, setTestText] = useState<Record<string, string>>({});
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
  
  // View states
  const [currentView, setCurrentView] = useState<'empty' | 'detail' | 'creator'>('empty');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showDetailsOnMobile, setShowDetailsOnMobile] = useState(false);
  const [voiceToEdit, setVoiceToEdit] = useState<CustomVoice | null>(null);

  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Load user voices
  useEffect(() => {
    loadUserVoices();
  }, []);

  // Update view based on voices and selection
  useEffect(() => {
    if (selectedVoice) {
      setCurrentView('detail');
      if (isMobileView) {
        setShowDetailsOnMobile(true);
      }
    } else if (voices.length === 0) {
      setCurrentView('empty');
    } else {
      setCurrentView('empty'); // Show empty state even with voices until one is selected
    }
  }, [selectedVoice, voices.length, isMobileView]);

  const loadUserVoices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/voices');
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      const data = await response.json();
      setVoices(data.voices || []);
    } catch (error) {
      console.error('Error loading voices:', error);
      toast.error('Failed to load voices');
      setVoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceClick = (voice: CustomVoice) => {
    setSelectedVoice(voice);
    setCurrentView('detail');
    if (isMobileView) {
      setShowDetailsOnMobile(true);
    }
  };

  const handleCreateVoice = () => {
    setSelectedVoice(null);
    setCurrentView('creator');
    if (isMobileView) {
      setShowDetailsOnMobile(true);
    }
  };

  const handleEditVoice = (voice: CustomVoice) => {
    setVoiceToEdit(voice);
    setCurrentView('creator');
    if (isMobileView) {
      setShowDetailsOnMobile(true);
    }
  };

  const handleVoiceCreated = (voice: CustomVoice) => {
    setVoices(prev => [voice, ...prev]);
    setSelectedVoice(voice);
    setCurrentView('detail');
    toast.success('Voice created successfully!');
  };

  const handleVoiceUpdated = (updatedVoice: CustomVoice) => {
    setVoices(prev => prev.map(voice => 
      voice.id === updatedVoice.id ? updatedVoice : voice
    ));
    setSelectedVoice(updatedVoice);
    setVoiceToEdit(null);
    setCurrentView('detail');
    if (isMobileView) {
      setShowDetailsOnMobile(true);
    }
  };

  const handleRemoveVoice = async (voiceId: string) => {
    setIsSaving(true);
    try {
      // Find the voice name before removing it
      const voiceToRemove = voices.find(voice => voice.id === voiceId);
      const voiceName = voiceToRemove ? capitalizeVoiceName(voiceToRemove.name) : 'voice';

      const response = await fetch(`/api/user/voices/${voiceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove voice');
      }
      
      // Update local state
      setVoices(prev => prev.filter(voice => voice.id !== voiceId));
      
      // Clear selected voice if it's the one being removed
      if (selectedVoice?.id === voiceId) {
        setSelectedVoice(null);
        setCurrentView('empty');
        if (isMobileView) {
          setShowDetailsOnMobile(false);
        }
      }
      
      toast.success(`Voice "${voiceName}" deleted successfully`);
    } catch (error) {
      console.error('Error removing voice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove voice');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestVoice = async (voice: CustomVoice) => {
    const text = testText[voice.id] || getDefaultTestText(voice);
    
    setIsPlaying(prev => ({ ...prev, [voice.id]: true }));
    
    try {
      const response = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: voice.openaiVoice,
          instructions: voice.description,
          language: voice.language,
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
        setIsPlaying(prev => ({ ...prev, [voice.id]: false }));
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(prev => ({ ...prev, [voice.id]: false }));
        URL.revokeObjectURL(audioUrl);
        toast.error('Error playing audio');
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing voice:', error);
      setIsPlaying(prev => ({ ...prev, [voice.id]: false }));
      toast.error('Failed to play voice');
    }
  };

  const handleTextChange = (voiceId: string, text: string) => {
    setTestText(prev => ({ ...prev, [voiceId]: text }));
  };

  const getDefaultTestText = (voice: CustomVoice): string => {
    const capitalizedName = capitalizeVoiceName(voice.name);
    const baseText = voice.description 
      ? `Hello! I'm ${capitalizedName}. ${voice.description.slice(0, 100)}` 
      : `Hello! I'm ${capitalizedName}, your voice assistant.`;
    
    return baseText.length > 200 ? baseText.slice(0, 200) + '...' : baseText;
  };

  const getVoiceTags = (voice: CustomVoice) => {
    const tags = [];
    
    if (voice.language) {
      tags.push({ key: 'language', value: voice.language });
    }
    
    if (voice.isDefault) {
      tags.push({ key: 'default', value: 'Default' });
    }
    
    // Add the base OpenAI voice with proper capitalization
    tags.push({ key: 'base', value: capitalizeVoiceName(voice.openaiVoice) });
    
    return tags;
  };

  const handleBackToVoices = () => {
    setSelectedVoice(null);
    setVoiceToEdit(null);
    setCurrentView('empty');
    if (isMobileView) {
      setShowDetailsOnMobile(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - My Voices */}
      {(!isMobileView || (isMobileView && !showDetailsOnMobile)) && (
        <VoiceSidebar
          userVoices={voices}
          selectedVoiceId={selectedVoice?.id || null}
          isLoading={isLoading}
          isSaving={isSaving}
          isMobileView={isMobileView}
          onVoiceSelect={handleVoiceClick}
          onRemoveVoice={handleRemoveVoice}
          onCreateVoice={handleCreateVoice}
        />
      )}

      {/* Main Content */}
      {(!isMobileView || (isMobileView && showDetailsOnMobile)) && (
        <div className="flex-1 overflow-auto">
          {/* Mobile back button for detail/creator views */}
          {isMobileView && showDetailsOnMobile && currentView !== 'empty' && (
            <div className="border-b border-gray-200 dark:border-gray-800 p-2">
              <Button
                variant="ghost"
                onClick={handleBackToVoices}
                className="flex items-center text-gray-600 dark:text-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to voices
              </Button>
            </div>
          )}
          
          {/* Render current view */}
          {currentView === 'detail' && selectedVoice ? (
            <VoiceDetail
              voice={selectedVoice}
              isPlaying={!!isPlaying[selectedVoice.id]}
              isSaving={isSaving}
              textInput={testText[selectedVoice.id] || ''}
              onRemove={handleRemoveVoice}
              onEdit={handleEditVoice}
              onTextChange={handleTextChange}
              onPlay={handleTestVoice}
              getImportantTags={getVoiceTags}
              getDefaultTextForVoice={getDefaultTestText}
            />
          ) : currentView === 'creator' ? (
            <VoiceCreator
              onBack={handleBackToVoices}
              onVoiceCreated={handleVoiceCreated}
              onVoiceUpdated={handleVoiceUpdated}
              isMobileView={isMobileView}
              voiceToEdit={voiceToEdit}
            />
          ) : (
            <EmptyState
              userVoicesCount={voices.length}
              onBrowseClick={handleCreateVoice}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default VoicesPage;
