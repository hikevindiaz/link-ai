"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { RiMoreFill, RiMessage2Line, RiUserLine, RiErrorWarningLine, RiDeleteBinLine, RiUser3Line, RiFileTextLine, RiTranslate2, RiRobot2Line, RiCodeLine } from "@remixicon/react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Divider } from "@/components/Divider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Icons } from "@/components/icons"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AgentTab } from "@/components/agents/tabs/agent-tab"
import { ChannelsTab } from "@/components/agents/tabs/channels-tab"
import { LLMTab } from "@/components/agents/tabs/llm-tab"
import { AddonConfigModal } from "@/components/agents/modals/addon-config-modal"
import { AgentHeader } from "@/components/agents/agent-header"
import { CallTab } from "@/components/agents/tabs/call-tab"
import { AddonsTab } from "@/components/agents/tabs/addons-tab"
import { FloatingActionCard } from "@/components/agents/floating-action-card"
import { agentSchema, type AgentFormValues } from "@/lib/validations/agent"
import type { Agent } from "@/types/agent"

interface Action {
  id: string
  type: string
  config: Record<string, any>
}

interface AgentSettingsProps {
  agent: Agent
  onSave: (data: Partial<Agent>) => Promise<any>
}

// Add the schema
const inquiryCustomizationSchema = z.object({
  inquiryEnabled: z.boolean(),
  inquiryLinkText: z.string().optional(),
  inquiryTitle: z.string().optional(),
  inquirySubtitle: z.string().optional(),
  inquiryEmailLabel: z.string().optional(),
  inquiryMessageLabel: z.string().optional(),
  inquirySendButtonText: z.string().optional(),
  inquiryAutomaticReplyText: z.string().optional(),
  inquiryDisplayLinkAfterXMessage: z.number().min(1).max(5).optional(),
})

export function AgentSettings({ agent, onSave }: AgentSettingsProps) {
  const [activeTab, setActiveTab] = useState("linkRep")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAddonId, setSelectedAddonId] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  
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
    // Reset save status when agent changes
    setSaveStatus('idle');
  }, [agent, form]);
  
  const handleSaveConfig = (config: any) => {
    setIsModalOpen(false)
  }

  const handleChatClick = () => {
    window.location.href = `/dashboard/agents/${agent.id}/chat`;
  };

  const handleDeleteClick = () => {
    // Implement delete functionality if needed
  };

  const handleSave = async (data: Partial<Agent>) => {
    setSaveStatus('saving');
    setErrorMessage('');
    setIsSaving(true);
    
    try {
      console.log("Agent settings saving data:", data);
      
      const response = await fetch(`/api/chatbots/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.error || `Error: ${response.status}`;
        console.error("Error saving agent:", errorMsg);
        toast.error(`Failed to save agent: ${errorMsg}`);
        return;
      }
      
      const updatedAgent = await response.json();
      console.log("Updated agent response:", updatedAgent);
      
      // Update the agent state with the new data
      // This is a workaround since we can't directly modify the agent prop
      // We'll call onSave to let the parent component know about the update
      await onSave(updatedAgent);
      
      toast.success('Agent settings saved successfully');
      setSaveStatus('success');
      
      // Reset save status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
      
      // Return the updated agent data to the child component
      return updatedAgent;
    } catch (error) {
      console.error('Error saving agent:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setSaveStatus('error');
      setErrorMessage(errorMsg);
      toast.error(`Failed to save agent: ${errorMsg}`);
      throw error; // Re-throw to let the child component handle it
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
    setSaveStatus('idle');
  };

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <div className="flex flex-col h-full max-w-full">
            <div className="flex-none p-8 pb-0">
              <AgentHeader 
                agent={agent}
                onChatClick={handleChatClick}
                onDeleteClick={handleDeleteClick}
                showActions={true}
              />
            </div>

            <div className="flex-1 overflow-auto p-8 pt-6 pb-2">
              <div className="max-w-[1200px] mx-auto mb-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="linkRep">Agent</TabsTrigger>
                    <TabsTrigger value="channels">Channels</TabsTrigger>
                    <TabsTrigger value="llm">LLM</TabsTrigger>
                    <TabsTrigger value="call">Call</TabsTrigger>
                    <TabsTrigger value="actions">Add-Ons</TabsTrigger>
                  </TabsList>

                  <div className="mb-0 pb-0">
                    <TabsContent value="linkRep">
                      <AgentTab agent={agent} onSave={onSave} form={form} />
                    </TabsContent>

                    <TabsContent value="channels">
                      <ChannelsTab agent={agent} onSave={onSave} />
                    </TabsContent>

                    <TabsContent value="llm">
                      <LLMTab agent={agent} onSave={onSave} />
                    </TabsContent>

                    <TabsContent value="call">
                      <CallTab agent={agent} onSave={onSave} />
                    </TabsContent>

                    <TabsContent value="actions">
                      <AddonsTab
                        agent={agent}
                        onSave={onSave}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>

          <FloatingActionCard 
            isSaving={isSaving}
            isDirty={form.formState.isDirty}
            onSave={form.handleSubmit(handleSave)}
            onCancel={handleCancel}
            saveStatus={saveStatus}
            errorMessage={errorMessage}
          />
        </form>
      </Form>

      <AddonConfigModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveConfig}
        addonId=""
        agent={agent}
      />
    </TooltipProvider>
  )
} 