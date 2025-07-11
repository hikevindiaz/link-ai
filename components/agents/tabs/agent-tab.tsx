import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Agent } from "@/types/agent";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { agentSchema, type AgentFormValues } from "@/lib/validations/agent";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SettingsTabWrapper } from "@/components/agents/settings-tab-wrapper";
import RiveGlint from "@/components/chat-interface/rive-glint";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Korean', value: 'ko' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Hindi', value: 'hi' },
];

// Helper function to get flag emoji for language codes
const getLanguageFlag = (languageCode: string): string => {
  const flags: Record<string, string> = {
    'en': '🇺🇸',
    'es': '🇪🇸', 
    'fr': '🇫🇷',
    'de': '🇩🇪',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'ru': '🇷🇺',
    'ja': '🇯🇵',
    'ko': '🇰🇷',
    'zh': '🇨🇳',
    'zh-tw': '🇹🇼',
    'ar': '🇸🇦',
    'hi': '🇮🇳',
    'nl': '🇳🇱',
    'sv': '🇸🇪',
    'da': '🇩🇰',
    'no': '🇳🇴',
    'fi': '🇫🇮',
    'pl': '🇵🇱',
    'tr': '🇹🇷',
    'he': '🇮🇱',
    'th': '🇹🇭',
    'vi': '🇻🇳',
    'id': '🇮🇩',
    'ms': '🇲🇾',
    'tl': '🇵🇭',
    'uk': '🇺🇦',
    'cs': '🇨🇿',
    'hu': '🇭🇺',
    'ro': '🇷🇴',
    'bg': '🇧🇬',
    'hr': '🇭🇷',
    'sk': '🇸🇰',
    'sl': '🇸🇮',
    'et': '🇪🇪',
    'lv': '🇱🇻',
    'lt': '🇱🇹',
    'el': '🇬🇷',
    'mt': '🇲🇹',
    'ga': '🇮🇪'
  };
  return flags[languageCode] || '🌐';
};

interface AgentTabProps {
  agent: Agent;
  onSave: (data: Partial<Agent>) => Promise<void>;
}

export function AgentTab({ agent, onSave }: AgentTabProps) {
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: agent.name,
      welcomeMessage: agent.welcomeMessage,
      prompt: agent.prompt,
      errorMessage: agent.errorMessage,
      language: agent.language || 'en',
      secondLanguage: agent.secondLanguage || 'none',
    },
  });
  
  // Reset form when agent changes
  useEffect(() => {
    form.reset({
      name: agent.name,
      welcomeMessage: agent.welcomeMessage,
      prompt: agent.prompt,
      errorMessage: agent.errorMessage,
      language: agent.language || 'en',
      secondLanguage: agent.secondLanguage || 'none',
    });
  }, [agent, form]);
  
  // State variables for tracking form changes
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  
  // Default prompt template
  const DEFAULT_PROMPT_TEMPLATE = `# Identity
You are a {role}, an expert in {domain}.

# Goal
Your objective is to {what you want the model to achieve}.

# Context
Provide any background, previous conversation, or data the model needs.

# Task
Describe precisely what you want the model to do:
- Step 1: …
- Step 2: …
- …

# Constraints
- Must be no more than {X} words.
- Only use {style/tone}.
- Avoid {forbidden content}.

# Examples (optional)
Input: …
Output: …

# Output Format
Specify JSON schema, bullet list, prose, code block, etc.`;

  const DEFAULT_SIMPLE_PROMPT = "You are a helpful assistant...";
  
  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(form.formState.isDirty);
    });
    return () => subscription.unsubscribe();
  }, [form, form.watch, form.formState.isDirty]);

  // Function to fetch user business information
  const fetchBusinessInfo = async () => {
    try {
      const response = await fetch('/api/user/business-info');
      const data = await response.json();
      
      if (data.success) {
        return {
          businessName: data.businessInfo.companyName || '',
          industry: data.businessInfo.industryType || 'technology',
        };
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
    }
    
    return {
      businessName: '',
      industry: 'technology',
    };
  };

  // Function to generate magic prompt
  const generateMagicPrompt = async () => {
    if (isGeneratingPrompt) return;
    
    setIsGeneratingPrompt(true);
    
    try {
      const currentPrompt = form.getValues('prompt');
      const agentName = form.getValues('name') || 'AI Assistant';
      
      // Check if current prompt is default template or user-written
      const isDefaultPrompt = currentPrompt === DEFAULT_PROMPT_TEMPLATE || currentPrompt.trim() === '';
      
      let requestData;
      
      if (isDefaultPrompt) {
        // Generate new prompt using business data
        const businessInfo = await fetchBusinessInfo();
        requestData = {
          type: 'new',
          agentName,
          businessName: businessInfo.businessName,
          industry: businessInfo.industry,
          template: DEFAULT_PROMPT_TEMPLATE
        };
      } else {
        // Improve existing prompt using template
        requestData = {
          type: 'improve',
          agentName,
          currentPrompt,
          template: DEFAULT_PROMPT_TEMPLATE
        };
      }
      
      const response = await fetch('/api/ai/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const data = await response.json();
      
      if (data.success && data.prompt) {
        form.setValue('prompt', data.prompt);
        setIsDirty(true);
        toast.success(isDefaultPrompt ? 'New prompt generated successfully!' : 'Prompt improved successfully!');
      } else {
        toast.error('Failed to generate prompt. Please try again.');
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast.error('Failed to generate prompt. Please try again.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Function to reset prompt to default
  const resetToDefaultPrompt = () => {
    form.setValue('prompt', DEFAULT_PROMPT_TEMPLATE);
    setIsDirty(true);
    toast.success('Prompt reset to default template');
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const values = form.getValues();
      
      const saveData = {
        name: values.name,
        welcomeMessage: values.welcomeMessage,
        prompt: values.prompt,
        errorMessage: values.errorMessage,
        language: values.language,
        secondLanguage: values.secondLanguage === 'none' ? null : values.secondLanguage,
      };
      
      await onSave(saveData);
      
      form.reset(values);
      toast.success("Basic settings saved successfully", {
        duration: 5000, // Increased from default to stay longer (5 seconds)
        icon: <Icons.check className="h-5 w-5 text-green-500 animate-bounce" />,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings", {
        duration: 5000,
        icon: <Icons.warning className="h-5 w-5 text-red-500" />,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    form.reset({
      name: agent.name,
      welcomeMessage: agent.welcomeMessage,
      prompt: agent.prompt,
      errorMessage: agent.errorMessage,
      language: agent.language || 'en',
      secondLanguage: agent.secondLanguage || 'none',
    });
  };

  return (
    <SettingsTabWrapper
      tabName="Agent"
      isDirty={isDirty}
      onSave={handleSaveSettings}
      onCancel={handleCancel}
    >
      <Form {...form}>
        <div className="space-y-6 pt-0 overflow-x-hidden w-full">
          {/* Agent Name */}
          <Card className="overflow-hidden p-0 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 w-full rounded-xl">
            <div className="border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800">
              <div className="flex items-center gap-2">
                <Icons.user className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <Label className="text-sm font-semibold text-black dark:text-white">Agent Name</Label>
              </div>
            </div>
            <div className="px-3 py-2 bg-white dark:bg-neutral-900">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="Customer Service Agent"
                        maxLength={50}
                        className="w-full rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      This name will be displayed to users when they interact with your agent.
                    </p>
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Welcome Message */}
          <Card className="overflow-hidden p-0 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800">
              <div className="flex items-center gap-2">
                <Icons.message className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <Label className="text-sm font-semibold text-black dark:text-white">Welcome Message</Label>
              </div>
            </div>
            <div className="px-3 py-2 bg-white dark:bg-neutral-900">
              <FormField
                control={form.control}
                name="welcomeMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="Hello, how can I help you today?"
                        maxLength={120}
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      The welcome message that will be sent to the user when they start a conversation.
                    </p>
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Default Prompt */}
          <Card className="overflow-hidden p-0 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.post className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <Label className="text-sm font-semibold text-black dark:text-white">Default Prompt</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateMagicPrompt}
                    disabled={isGeneratingPrompt}
                    className="h-8 px-3 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 border-0"
                  >
                    <RiveGlint 
                      isThinking={isGeneratingPrompt}
                      isSpeaking={false}
                      isListening={!isGeneratingPrompt}
                      className="w-4 h-4 mr-1.5"
                    />
                    {isGeneratingPrompt ? 'Generating...' : 'Magic Prompt'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                      >
                        <Icons.refresh className="w-4 h-4 mr-1.5" />
                        Reset
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset to Default Template</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will replace your current prompt with the default template structure. 
                          Any custom content will be lost. Are you sure you want to continue?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={resetToDefaultPrompt}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          Reset Prompt
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
            <div className="px-3 py-2 bg-white dark:bg-neutral-900">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="You are a helpful assistant..."
                        maxLength={4000}
                        className="min-h-32 resize-y rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        The system prompt that guides your agent's behavior. This is not seen by the user.
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {field.value?.length || 0}/4000
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Error Message */}
          <Card className="overflow-hidden p-0 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800">
              <div className="flex items-center gap-2">
                <Icons.warning className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <Label className="text-sm font-semibold text-black dark:text-white">Error Message</Label>
              </div>
            </div>
            <div className="px-3 py-2 bg-white dark:bg-neutral-900">
              <FormField
                control={form.control}
                name="errorMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="I'm sorry, I encountered an error. Please try again later."
                        maxLength={100}
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      This message will be shown to users if there's an error processing their request.
                    </p>
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Language Settings */}
          <Card className="overflow-hidden p-0 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800">
              <div className="flex items-center gap-2">
                <Icons.speech className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <Label className="text-sm font-semibold text-black dark:text-white">Language Settings</Label>
              </div>
            </div>
            <div className="px-3 py-2 bg-white dark:bg-neutral-900">
              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-black dark:text-white">Primary Language</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {languageOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getLanguageFlag(option.value)}</span>
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        The primary language your agent will use to communicate.
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-black dark:text-white">Secondary Language</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select secondary language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🚫</span>
                              <span>None</span>
                            </div>
                          </SelectItem>
                          {languageOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getLanguageFlag(option.value)}</span>
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        Optional secondary language for bilingual support.
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>
        </div>
      </Form>
    </SettingsTabWrapper>
  );
} 