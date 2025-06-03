"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { ArrowLeft } from "lucide-react";
import { cn } from '@/lib/utils';

// OpenAI available voices with descriptions
const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced tone' },
  { id: 'ash', name: 'Ash', description: 'Calm, collected voice' },
  { id: 'ballad', name: 'Ballad', description: 'Smooth, storytelling voice' },
  { id: 'coral', name: 'Coral', description: 'Warm, friendly tone' },
  { id: 'echo', name: 'Echo', description: 'Clear, articulate voice' },
  { id: 'sage', name: 'Sage', description: 'Wise, thoughtful tone' },
  { id: 'shimmer', name: 'Shimmer', description: 'Bright, energetic voice' },
  { id: 'verse', name: 'Verse', description: 'Natural, conversational tone' },
] as const;

// OpenAI TTS supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'th', name: 'Thai' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
] as const;

// Voice templates for quick selection - we'll have multiple sets to rotate through
const VOICE_TEMPLATE_SETS = [
  [
    {
      id: 'puerto-rican-woman',
      name: 'Puerto Rican Woman',
      preview: 'Professional Puerto Rican woman in her 35\'s, very upbeat',
      description: `Voice: Professional Puerto Rican woman in her 35's, very upbeat
Tone: Confident, warm, and business-oriented with slight accent
Dialect: Puerto Rican Spanish influence with clear English
Pronunciation: Clear articulation for business communication
Features: Upbeat energy, professional demeanor, culturally authentic`,
      language: 'es'
    },
    {
      id: 'bedtime-story',
      name: 'Bedtime Story',
      preview: 'Gentle, curious narrator guiding magical adventures',
      description: `Voice: Gentle, curious narrator guiding magical adventures
Tone: Magical, warm, and inviting for young listeners
Dialect: British accent with storytelling cadence
Pronunciation: Clear with slight pauses for emphasis
Features: Wonder-inducing, child-friendly, fairy tale atmosphere`,
      language: 'en'
    },
    {
      id: 'auctioneer',
      name: 'Auctioneer',
      preview: 'Fast-talking, energetic auctioneer with Southern charm',
      description: `Voice: Fast-talking, energetic auctioneer with Southern charm
Tone: High-energy, enthusiastic, and persuasive
Dialect: Southern American with auction expertise
Pronunciation: Rapid, rhythmic with classic auctioneer cadence
Features: Commanding presence, auction expertise, compelling delivery`,
      language: 'en'
    },
    {
      id: 'gourmet-chef',
      name: 'Gourmet Chef',
      preview: 'Passionate French chef with culinary sophistication',
      description: `Voice: Passionate French chef with culinary sophistication
Tone: Sophisticated, enthusiastic about food and cooking
Dialect: Slight French accent with culinary terminology
Pronunciation: Deliberate and expressive, emphasizing food terms
Features: Refined taste, extensive culinary knowledge, passionate delivery`,
      language: 'en'
    }
  ],
  [
    {
      id: 'nyc-cabbie',
      name: 'NYC Cabbie',
      preview: 'Street-smart New York taxi driver with local knowledge',
      description: `Voice: Street-smart New York taxi driver with local knowledge
Tone: Direct, friendly with classic New York attitude
Dialect: New York accent with fast-paced city speech
Pronunciation: Quick and conversational, NYC rhythm
Features: Street smarts, extensive city knowledge, quick wit`,
      language: 'en'
    },
    {
      id: 'true-crime-buff',
      name: 'True Crime Buff',
      preview: 'Investigative storyteller with mystery expertise',
      description: `Voice: Investigative storyteller with mystery expertise
Tone: Serious, intriguing, with mysterious delivery
Dialect: Clear American with investigative journalism style
Pronunciation: Measured and dramatic with strategic pauses
Features: Deep criminal case knowledge, suspense building, captivating narration`,
      language: 'en'
    },
    {
      id: 'yoga-instructor',
      name: 'Yoga Instructor',
      preview: 'Calm, centered wellness guide with peaceful energy',
      description: `Voice: Calm, centered wellness guide with peaceful energy
Tone: Soothing, mindful, and encouraging
Dialect: Clear American with wellness terminology
Pronunciation: Slow, deliberate, with calming rhythm
Features: Inner peace, mindfulness expertise, stress-relieving presence`,
      language: 'en'
    },
    {
      id: 'tech-reviewer',
      name: 'Tech Reviewer',
      preview: 'Knowledgeable technology enthusiast with analytical mind',
      description: `Voice: Knowledgeable technology enthusiast with analytical mind
Tone: Informative, excited about innovation, objective
Dialect: Clear modern American with tech terminology
Pronunciation: Clear and precise, emphasizing technical details
Features: Deep tech knowledge, analytical thinking, consumer advocacy`,
      language: 'en'
    }
  ]
] as const;

// Interface for CustomVoice
interface CustomVoice {
  id: string;
  name: string;
  openaiVoice: string;
  description?: string;
  language?: string;
  isDefault: boolean;
  addedOn: string;
}

interface VoiceCreatorProps {
  onBack: () => void;
  onVoiceCreated: (voice: any) => void;
  onVoiceUpdated?: (voice: any) => void;
  isMobileView: boolean;
  voiceToEdit?: CustomVoice | null;
}

const VoiceCreator = ({ onBack, onVoiceCreated, onVoiceUpdated, isMobileView, voiceToEdit }: VoiceCreatorProps) => {
  const isEditing = !!voiceToEdit;
  
  const [formData, setFormData] = useState({
    name: voiceToEdit?.name || '',
    openaiVoice: voiceToEdit?.openaiVoice || '',
    description: voiceToEdit?.description || '',
    language: voiceToEdit?.language || '',
    isDefault: voiceToEdit?.isDefault || false,
  });
  const [testText, setTestText] = useState('Hello! This is a test of your custom voice. How does it sound?');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [currentTemplateSetIndex, setCurrentTemplateSetIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingTestText, setIsGeneratingTestText] = useState(false);

  const currentTemplates = VOICE_TEMPLATE_SETS[currentTemplateSetIndex];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = currentTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setFormData(prev => ({
        ...prev,
        description: template.description,
        language: template.language,
        name: prev.name || template.name
      }));
    } else {
      setSelectedTemplate(null);
    }
  };

  const handleNewTemplates = () => {
    // Cycle to next template set
    const nextIndex = (currentTemplateSetIndex + 1) % VOICE_TEMPLATE_SETS.length;
    setCurrentTemplateSetIndex(nextIndex);
    setSelectedTemplate(null); // Clear selection when switching sets
    toast.success('New templates loaded!');
  };

  const generateDescription = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a voice name first');
      return;
    }
    
    if (!formData.openaiVoice) {
      toast.error('Please select a base voice first');
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const selectedTemplateData = selectedTemplate 
        ? currentTemplates.find(t => t.id === selectedTemplate)
        : null;

      const response = await fetch('/api/ai/generate-voice-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceName: formData.name,
          openaiVoice: formData.openaiVoice,
          language: formData.language,
          template: selectedTemplateData ? {
            name: selectedTemplateData.name,
            description: selectedTemplateData.description
          } : null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate description');
      }

      const data = await response.json();
      handleInputChange('description', data.description);
      toast.success('Voice description generated!');
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error('Failed to generate description');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const generateTestText = async () => {
    setIsGeneratingTestText(true);
    try {
      const response = await fetch('/api/ai/generate-test-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceName: formData.name || 'Custom Voice',
          openaiVoice: formData.openaiVoice,
          language: formData.language,
          description: formData.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate test text');
      }

      const data = await response.json();
      setTestText(data.testText);
      toast.success('Test text generated!');
    } catch (error) {
      console.error('Error generating test text:', error);
      toast.error('Failed to generate test text');
    } finally {
      setIsGeneratingTestText(false);
    }
  };

  const handleTestVoice = async () => {
    if (!formData.openaiVoice || !testText.trim()) {
      toast.error('Please select a voice and enter test text');
      return;
    }

    setIsPlaying(true);
    try {
      const response = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          voice: formData.openaiVoice,
          instructions: formData.description,
          language: formData.language,
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
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        toast.error('Error playing audio');
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error testing voice:', error);
      setIsPlaying(false);
      toast.error('Failed to test voice');
    }
  };

  const handleSaveVoice = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a voice name');
      return;
    }
    
    if (!formData.openaiVoice) {
      toast.error('Please select an OpenAI voice');
      return;
    }

    setIsSaving(true);
    try {
      const url = isEditing ? `/api/user/voices/${voiceToEdit!.id}` : '/api/user/voices';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} voice`);
      }

      const data = await response.json();
      const actionText = isEditing ? 'updated' : 'created';
      const voiceName = formData.name;
      
      toast.success(`Voice "${voiceName}" ${actionText} successfully!`);
      
      if (isEditing && onVoiceUpdated) {
        onVoiceUpdated(data.voice);
      } else {
        onVoiceCreated(data.voice);
      }
      
      if (!isEditing) {
        // Reset form only when creating (not editing)
        setFormData({
          name: '',
          openaiVoice: '',
          description: '',
          language: '',
          isDefault: false,
        });
        setTestText('Hello! This is a test of your custom voice. How does it sound?');
      }
      
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} voice:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} voice`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedVoiceInfo = OPENAI_VOICES.find(v => v.id === formData.openaiVoice);
  const selectedLanguage = SUPPORTED_LANGUAGES.find(l => l.code === formData.language);

  return (
    <div className="p-6">
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
          {isEditing ? 'Edit Voice' : 'Create Custom Voice'}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {isEditing 
            ? 'Modify your voice settings and personality'
            : 'Combine OpenAI voices with custom descriptions to create unique voice personalities'
          }
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Configuration */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
            Voice Configuration
          </h2>
          
          <div className="space-y-4">
            {/* Voice Name */}
            <div>
              <Label htmlFor="voice-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Voice Name *
              </Label>
              <Input
                id="voice-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Professional Assistant, Friendly Helper"
                className="mt-1"
              />
            </div>

            {/* OpenAI Voice Selection */}
            <div>
              <Label htmlFor="openai-voice" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Base Voice *
              </Label>
              <Select 
                value={formData.openaiVoice} 
                onValueChange={(value) => handleInputChange('openaiVoice', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an OpenAI voice" />
                </SelectTrigger>
                <SelectContent>
                  {OPENAI_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex flex-col items-start text-left w-full">
                        <span className="font-medium">{voice.name}</span>
                        <span className="text-xs text-gray-500">{voice.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voice Template Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Voice Templates (Optional)
                </Label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleNewTemplates}
                  className="text-xs px-2 py-1 h-7"
                >
                  <i className="ri-refresh-line text-sm mr-1" />
                  New
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentTemplates.map((template) => {
                  const isSelected = selectedTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(isSelected ? '' : template.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all duration-200",
                        "hover:border-indigo-300 hover:shadow-sm",
                        isSelected 
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-500/20" 
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      )}
                    >
                      <div className="space-y-1">
                        <h4 className={cn(
                          "font-medium text-sm",
                          isSelected 
                            ? "text-indigo-900 dark:text-indigo-100" 
                            : "text-gray-900 dark:text-gray-100"
                        )}>
                          {template.name}
                        </h4>
                        <p className={cn(
                          "text-xs line-clamp-2",
                          isSelected 
                            ? "text-indigo-700 dark:text-indigo-300" 
                            : "text-gray-500 dark:text-gray-400"
                        )}>
                          {template.preview}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select a template to auto-fill your voice description, or leave blank to create from scratch
              </p>
            </div>

            {/* Voice Description */}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Voice Description
                </Label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generateDescription}
                  disabled={isGeneratingDescription || !formData.name.trim() || !formData.openaiVoice}
                  className="text-xs px-2 py-1 h-7"
                >
                  {isGeneratingDescription ? (
                    <Icons.loading className="h-3 w-3 animate-spin" />
                  ) : (
                    <i className="ri-quill-pen-ai-line text-sm" />
                  )}
                </Button>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={`Voice: [Base voice characteristics]
Tone: [Emotional quality and attitude]
Dialect: [Accent or regional speech patterns]
Pronunciation: [Clarity, emphasis, and articulation]
Features: [Unique characteristics and personality traits]`}
                className="mt-1"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Follow the template format above for consistent voice descriptions
              </p>
            </div>

            {/* Language Selection */}
            <div>
              <Label htmlFor="language" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Primary Language
              </Label>
              <Select 
                value={formData.language || 'none'} 
                onValueChange={(value) => handleInputChange('language', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select primary language (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific language</SelectItem>
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLanguage && (
                <p className="text-xs text-gray-500 mt-1">
                  Voice will be optimized for {selectedLanguage.name}
                </p>
              )}
            </div>

            {/* Set as Default */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is-default" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Set as Default Voice
                </Label>
                <p className="text-xs text-gray-500">Use this voice as your default for new agents</p>
              </div>
              <Switch
                id="is-default"
                checked={formData.isDefault}
                onCheckedChange={(checked) => handleInputChange('isDefault', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Voice Testing */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
            Test Your Voice
          </h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="test-text" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Test Text
                </Label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generateTestText}
                  disabled={isGeneratingTestText}
                  className="text-xs px-2 py-1 h-7"
                >
                  {isGeneratingTestText ? (
                    <Icons.loading className="h-3 w-3 animate-spin" />
                  ) : (
                    <i className="ri-quill-pen-ai-line text-sm" />
                  )}
                </Button>
              </div>
              <Textarea
                id="test-text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to test how your voice sounds"
                className="mt-1"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="primary"
                onClick={handleTestVoice}
                disabled={isPlaying || !formData.openaiVoice}
                className="flex-1"
              >
                {isPlaying ? (
                  <>
                    <Icons.loading className="mr-2 h-4 w-4 animate-spin" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Icons.play className="mr-2 h-4 w-4" />
                    Test Voice
                  </>
                )}
              </Button>
            </div>

            {!formData.openaiVoice && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Please select a base voice to enable testing
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isSaving}
        >
          Cancel
        </Button>
        
        <Button
          variant="primary"
          onClick={handleSaveVoice}
          disabled={isSaving || !formData.name.trim() || !formData.openaiVoice}
        >
          {isSaving ? (
            <>
              <Icons.loading className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Updating Voice...' : 'Creating Voice...'}
            </>
          ) : (
            isEditing ? 'Update Voice' : 'Create Voice'
          )}
        </Button>
      </div>
    </div>
  );
};

export default VoiceCreator; 