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
import { ActionsTab } from "@/components/agents/tabs/actions-tab"
import { AddonConfigModal } from "@/components/agents/modals/addon-config-modal"
import { AgentHeader } from "@/components/agents/agent-header"
import { CallTab } from "@/components/agents/tabs/call-tab"
import { AgentConfigProvider, useAgentConfig } from "@/hooks/use-agent-config"
import type { Agent } from "@/types/agent"
import { logger } from "@/lib/logger"
import { agentSchema, type AgentFormValues } from "@/lib/validations/agent"

interface AgentSettingsProps {
  agent: Agent
  onSave: (data: Partial<Agent>) => Promise<Agent>
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

// Internal component that has access to the AgentConfigProvider
function AgentSettingsContent({ agent, onSave, showHeader = true, activeTab = "linkRep", showTabs = true }: AgentSettingsProps) {
  const { refreshFromParent } = useAgentConfig();
  const [internalActiveTab, setInternalActiveTab] = useState(activeTab)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAddonId, setSelectedAddonId] = useState("")
  const [currentAgent, setCurrentAgent] = useState(agent)
  
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: agent,
  })

  // Update internal tab when external tab changes
  useEffect(() => {
    setInternalActiveTab(activeTab);
  }, [activeTab]);
  
  // Update internal agent and refresh context when agent prop changes
  useEffect(() => {
    if (agent && (!currentAgent || agent.id !== currentAgent.id || JSON.stringify(agent) !== JSON.stringify(currentAgent))) {
      console.log('[AgentSettings] Agent prop changed, updating internal state and refreshing context');
      setCurrentAgent(agent);
      refreshFromParent(agent);
    }
  }, [agent, currentAgent, refreshFromParent]);

  const handleSaveConfig = (config: any) => {
    setIsModalOpen(false)
  }

  const handleChatClick = () => {
    window.location.href = `/dashboard/agents/${agent.id}/chat`;
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  // Enhanced save handler that updates the local agent state
  const handleSave = async (data: Partial<Agent>) => {
    try {
      logger.info('Saving agent settings', { agentId: agent.id, updatedFields: Object.keys(data) }, 'agent');
      
      // Call the parent's onSave function
      const updatedAgent = await onSave(data);
      
      // Update the local agent state
      setCurrentAgent(updatedAgent);
      
      // Refresh the context with the updated agent
      refreshFromParent(updatedAgent);
      
      logger.info('Agent settings saved successfully', { agentId: updatedAgent.id }, 'agent');
      
      return updatedAgent;
    } catch (error) {
      logger.error('Failed to save agent settings', { 
        agentId: agent.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'agent');
      throw error; // Re-throw to let the tab handle the error
    }
  };

  const handleCancel = () => {
    logger.debug('Cancelling agent settings changes', { agentId: agent.id }, 'agent');
    form.reset();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full max-w-full overflow-x-hidden">
        {showHeader && (
          <div className="flex-none p-8 pb-0">
            <AgentHeader 
              agent={currentAgent}
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
                    <AgentTab agent={currentAgent} onSave={handleSave} />
                  </TabsContent>

                  <TabsContent value="channels">
                    <ChannelsTab agent={currentAgent} onSave={handleSave} />
                  </TabsContent>

                  <TabsContent value="llm">
                    <LLMTab agent={currentAgent} onSave={handleSave} />
                  </TabsContent>

                  <TabsContent value="call">
                    <CallTab agent={currentAgent} onSave={handleSave} />
                  </TabsContent>

                  <TabsContent value="actions">
                    <ActionsTab agent={currentAgent} onSave={handleSave} />
                  </TabsContent>
                </div>
              </Tabs>
            ) : (
              <div className="pt-0 w-full overflow-x-hidden">
                {internalActiveTab === "linkRep" && (
                  <AgentTab agent={currentAgent} onSave={handleSave} />
                )}
                {internalActiveTab === "channels" && (
                  <ChannelsTab agent={currentAgent} onSave={handleSave} />
                )}
                {internalActiveTab === "llm" && (
                  <LLMTab agent={currentAgent} onSave={handleSave} />
                )}
                {internalActiveTab === "call" && (
                  <CallTab agent={currentAgent} onSave={handleSave} />
                )}
                {internalActiveTab === "actions" && (
                  <ActionsTab agent={currentAgent} onSave={handleSave} />
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
        agent={currentAgent}
      />
    </TooltipProvider>
  )
}

export function AgentSettings({ agent, onSave, showHeader = true, activeTab = "linkRep", showTabs = true }: AgentSettingsProps) {
  return (
    <AgentConfigProvider initialAgent={agent}>
      <AgentSettingsContent 
        agent={agent}
        onSave={onSave}
        showHeader={showHeader}
        activeTab={activeTab}
        showTabs={showTabs}
      />
    </AgentConfigProvider>
  )
} 