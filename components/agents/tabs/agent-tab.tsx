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

interface AgentTabProps {
  agent: Agent;
  onSave: (data: Partial<Agent>) => Promise<void>;
  form: ReturnType<typeof useForm<AgentFormValues>>;
}

export function AgentTab({ agent, onSave, form }: AgentTabProps) {
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
  
  // State variables for tracking form changes
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(form.formState.isDirty);
    });
    return () => subscription.unsubscribe();
  }, [form, form.watch, form.formState.isDirty]);

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
      toast.success("Basic settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
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
      <div className="space-y-6 pt-4">
        {/* Basic Info */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Icons.user className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-50">Basic Info</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="Customer Service Agent"
                      className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-900"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                    This name will be displayed to users when they interact with your agent.
                  </p>
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* Welcome Message */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Icons.message className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-50">Welcome Message</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <FormField
              control={form.control}
              name="welcomeMessage"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="Hello, how can I help you today?"
                      className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-900"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                    The welcome message that will be sent to the user when they start a conversation.
                  </p>
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* Default Prompt */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Icons.post className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-50">Default Prompt</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      {...field}
                      placeholder="You are a helpful assistant..."
                      className="min-h-32 resize-y bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-900"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                    The system prompt that guides your agent's behavior. This is not seen by the user.
                  </p>
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* Error Message */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Icons.warning className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-50">Error Message</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <FormField
              control={form.control}
              name="errorMessage"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="I'm sorry, I encountered an error. Please try again later."
                      className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-900"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                    This message will be shown to users if there's an error processing their request.
                  </p>
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* Language Settings */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Icons.speech className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-50">Language Settings</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <div className="grid gap-6">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Language</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-900">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                      The primary language your agent will use to communicate.
                    </p>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Card>
      </div>
    </SettingsTabWrapper>
  );
} 