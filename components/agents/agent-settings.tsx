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
import { ActionsTab } from "@/components/agents/tabs/actions-tab"
import { agentSchema, type AgentFormValues } from "@/lib/validations/agent"
import type { Agent } from "@/types/agent"
import { logger } from "@/lib/logger"
import { AgentConfigProvider } from "@/hooks/use-agent-config"

interface Action {
  id: string
  type: string
  config: Record<string, any>
}

interface AgentSettingsProps {
  agent: Agent
  onSave: (data: Partial<Agent>) => Promise<any>
  showHeader?: boolean
  activeTab?: string
  showTabs?: boolean
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

export function AgentSettings({ agent, onSave, showHeader = true, activeTab = "linkRep", showTabs = true }: AgentSettingsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(activeTab)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAddonId, setSelectedAddonId] = useState("")
  
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: agent,
  })

  // Update internal tab when external tab changes
  useEffect(() => {
    setInternalActiveTab(activeTab);
  }, [activeTab]);

  const handleSaveConfig = (config: any) => {
    setIsModalOpen(false)
  }

  const handleChatClick = () => {
    window.location.href = `/dashboard/agents/${agent.id}/chat`;
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      logger.info('Saving agent settings', { agentId: agent.id }, 'agent');
      await onSave(form.getValues());
      logger.info('Agent settings saved successfully', { agentId: agent.id }, 'agent');
    } catch (error) {
      logger.error('Failed to save agent settings', { 
        agentId: agent.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'agent');
      toast.error("Failed to save settings");
    }
  };

  const handleCancel = () => {
    logger.debug('Cancelling agent settings changes', { agentId: agent.id }, 'agent');
    form.reset();
  };

  return (
    <AgentConfigProvider initialAgent={agent}>
      <TooltipProvider>
        <div className="flex flex-col h-full max-w-full overflow-x-hidden">
        {showHeader && (
          <div className="flex-none p-8 pb-0">
            <AgentHeader 
              agent={agent}
              onChatClick={handleChatClick}
              onDeleteClick={handleDeleteClick}
              showActions={true}
            />
          </div>
        )}

        <div className="flex-1 overflow-auto p-6 overflow-x-hidden">
          <div className={showTabs ? "max-w-[1200px] mx-auto" : "w-full"}>
            {showTabs ? (
              <Tabs value={internalActiveTab} onValueChange={setInternalActiveTab}>
                <TabsList>
                  <TabsTrigger value="linkRep">Agent</TabsTrigger>
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                  <TabsTrigger value="llm">LLM</TabsTrigger>
                  <TabsTrigger value="call">Call</TabsTrigger>
                  <TabsTrigger value="actions">Add-Ons</TabsTrigger>
                </TabsList>

                <div className="mb-0 pb-0">
                  <TabsContent value="linkRep">
                    <AgentTab agent={agent} onSave={onSave} />
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
                    <ActionsTab
                      agent={agent}
                      onSave={onSave}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            ) : (
              <div className="pt-0 w-full overflow-x-hidden">
                {internalActiveTab === "linkRep" && (
                  <AgentTab agent={agent} onSave={onSave} />
                )}
                {internalActiveTab === "channels" && (
                  <ChannelsTab agent={agent} onSave={onSave} />
                )}
                {internalActiveTab === "llm" && (
                  <LLMTab agent={agent} onSave={onSave} />
                )}
                {internalActiveTab === "call" && (
                  <CallTab agent={agent} onSave={onSave} />
                )}
                {internalActiveTab === "actions" && (
                  <ActionsTab agent={agent} onSave={onSave} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddonConfigModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveConfig}
        addonId=""
        agent={agent}
      />
    </TooltipProvider>
    </AgentConfigProvider>
  )
} 