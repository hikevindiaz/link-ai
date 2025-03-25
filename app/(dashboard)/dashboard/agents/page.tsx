'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/homepage/card";
import { Button } from "@/components/Button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Divider } from "@/components/Divider";
import { EmptyState } from "@/components/agents/empty-state";
import { CreateAgentDrawer } from "@/components/agents/create-agent-drawer";
import { toast } from "sonner";
import { RiMoreFill } from "@remixicon/react";
import { LinkAIAgentIcon } from "@/components/icons/LinkAIAgentIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu";
import { RiMessage2Line, RiUserLine, RiErrorWarningLine, RiDeleteBinLine, RiAddLine } from "@remixicon/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { AgentSettings } from "@/components/agents/agent-settings";
import type { Agent } from "@/types/agent";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

// Define a simplified agent type for the list view
interface SimpleAgent {
  id: string;
  name: string;
  status: 'draft' | 'live';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Function to convert database chatbot to Agent type
function convertToAgent(chatbot: any): Agent {
  return {
    id: chatbot.id,
    name: chatbot.name,
    status: chatbot.isLive ? 'live' : 'draft',
    userId: chatbot.userId,
    createdAt: new Date(chatbot.createdAt),
    updatedAt: new Date(chatbot.updatedAt),
    welcomeMessage: chatbot.welcomeMessage || "Hello! How can I help you today?",
    prompt: chatbot.prompt || "You are a helpful assistant.",
    errorMessage: chatbot.chatbotErrorMessage || "I'm sorry, I encountered an error. Please try again.",
    language: chatbot.language || "en",
    secondLanguage: chatbot.secondLanguage || "none",
    openaiId: chatbot.openaiId,
    modelId: chatbot.modelId,
    model: chatbot.model ? {
      id: chatbot.model.id,
      name: chatbot.model.name,
    } : undefined,
  };
}

const colorCombinations = [
  { text: 'text-fuchsia-800 dark:text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-500/20' },
  { text: 'text-indigo-800 dark:text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
  { text: 'text-pink-800 dark:text-pink-500', bg: 'bg-pink-100 dark:bg-pink-500/20' },
  { text: 'text-emerald-800 dark:text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
  { text: 'text-orange-800 dark:text-orange-500', bg: 'bg-orange-100 dark:bg-orange-500/20' },
  { text: 'text-indigo-800 dark:text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-500/20' },
  { text: 'text-yellow-800 dark:text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-500/20' },
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function TestChatbotPage() {
  const { data: session } = useSession();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<SimpleAgent[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [agentToDelete, setAgentToDelete] = useState<SimpleAgent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'success' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, [session?.user?.id]);

  const fetchAgents = async () => {
    if (!session?.user?.id) return;
    
    try {
      setIsLoading(true);
      console.log('[AGENTS DEBUG] Fetching agents for user:', session.user.id);
      
      const response = await fetch(`/api/chatbots?userId=${session.user.id}`);
      console.log('[AGENTS DEBUG] API Status:', response.status, response.statusText);
      
      if (!response.ok) throw new Error('Failed to fetch agents');
      
      const data = await response.json();
      console.log('[AGENTS DEBUG] Response data:', JSON.stringify(data));
      
      // Check if data is an object with chatbots property (new API format)
      if (data && data.success && Array.isArray(data.chatbots)) {
        console.log('[AGENTS DEBUG] Found chatbots array in response, using it');
        setAgents(data.chatbots.map((chatbot: any) => ({
          id: chatbot.id,
          name: chatbot.name,
          status: chatbot.isLive ? 'live' : 'draft',
          userId: session.user?.id || '',
          createdAt: new Date(chatbot.createdAt),
          updatedAt: new Date(chatbot.updatedAt)
        })));
      } else if (Array.isArray(data)) {
        // Legacy format - direct array
        console.log('[AGENTS DEBUG] Using direct array response');
        setAgents(data.filter((agent: any) => agent.userId === session.user?.id));
      } else {
        console.error('[AGENTS DEBUG] Unexpected data format:', data);
        setAgents([]);
      }
    } catch (error) {
      console.error('[AGENTS DEBUG] Error fetching agents:', error);
      toast.error("Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgent = async (name: string, templateId: string) => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to create an agent');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/chatbots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          prompt: 'You are a helpful assistant.',
          welcomeMessage: 'Hello! How can I help you today?',
          chatbotErrorMessage: "I'm sorry, I encountered an error. Please try again.",
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create agent');
      }

      const newAgent = await response.json();
      toast.success('Agent created successfully');
      
      // Refresh the agent list
      fetchAgents();
      
      // Close the drawer
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    setIsDeleting(true);
    setDeleteStatus('deleting');
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/chatbots/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete agent (${response.status})`);
      }

      // Remove the agent from the list
      setAgents(agents.filter(agent => agent.id !== id));
      setSelectedAgent(null);
      
      // Set success status
      setDeleteStatus('success');
      
      // Close the dialog after a short delay to show success message
      setTimeout(() => {
        setAgentToDelete(null);
        setDeleteStatus('idle');
        toast.success('Agent deleted successfully');
      }, 1500);
    } catch (error) {
      console.error('Error deleting agent:', error);
      setDeleteStatus('error');
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete agent');
      toast.error('Failed to delete agent');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchAgentDetails = async (agentId: string) => {
    try {
      const response = await fetch(`/api/chatbots/${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch agent details');
      
      const data = await response.json();
      return convertToAgent(data);
    } catch (error) {
      console.error('Error fetching agent details:', error);
      toast.error("Failed to load agent details");
      return null;
    }
  };

  const handleAgentChat = (agentId: string) => {
    window.location.href = `/dashboard/agents/${agentId}/chat`;
  };

  const handleAgentSelect = async (agent: SimpleAgent) => {
    const agentDetails = await fetchAgentDetails(agent.id);
    if (agentDetails) {
      setSelectedAgent(agentDetails);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              My Agents
            </h2>
            <Button
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={() => setIsDrawerOpen(true)}
            >
              <RiAddLine className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Divider className="mt-4" />
        
        <div className="px-4 pb-4 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
              <span className="ml-2 text-sm text-gray-500">Loading agents...</span>
            </div>
          ) : agents.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 mt-1">
              {agents.map((agent, index) => (
                <Card 
                  key={agent.id} 
                  asChild 
                  className={cn(
                    "group transition-all duration-200",
                    "hover:bg-gray-50 dark:hover:bg-gray-900",
                    "hover:shadow-sm",
                    "hover:border-gray-300 dark:hover:border-gray-700",
                    selectedAgent?.id === agent.id && [
                      "border-indigo-600 dark:border-indigo-500",
                      "bg-indigo-50/50 dark:bg-indigo-500/5",
                      "ring-1 ring-indigo-500 dark:ring-indigo-500"
                    ]
                  )}
                >
                  <div className="relative px-3.5 py-2.5">
                    <div className="flex items-center space-x-3">
                      <span
                        className={cn(
                          colorCombinations[index % colorCombinations.length].bg,
                          colorCombinations[index % colorCombinations.length].text,
                          'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                          'transition-transform duration-200 group-hover:scale-[1.02]',
                          selectedAgent?.id === agent.id && [
                            "border-2 border-indigo-500 dark:border-indigo",
                            "shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                          ]
                        )}
                        aria-hidden={true}
                      >
                        {getInitials(agent.name)}
                      </span>
                      <div className="truncate min-w-0">
                        <p className={cn(
                          "truncate text-sm font-medium text-gray-900 dark:text-gray-50",
                          selectedAgent?.id === agent.id && "text-indigo-600 dark:text-indigo-400"
                        )}>
                          <button 
                            onClick={() => handleAgentSelect(agent)}
                            className="focus:outline-none hover:no-underline no-underline"
                            type="button"
                          >
                            <span className="absolute inset-0" aria-hidden="true" />
                            {agent.name}
                          </button>
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-gray-500 dark:text-gray-500 pointer-events-none no-underline">
                            ID: {agent.id.slice(0, 12)}
                          </p>
                          <Badge
                            variant={agent.status === 'live' ? 'default' : 'secondary'}
                            className={cn(
                              "text-xs py-0 px-1.5",
                              selectedAgent?.id === agent.id && agent.status === 'draft' && 
                              "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
                            )}
                          >
                            {agent.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="absolute right-2.5 top-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <RiMoreFill className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-56">
                          <DropdownMenuLabel>Agent Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => handleAgentChat(agent.id)}>
                              <span className="flex items-center gap-x-2">
                                <RiMessage2Line className="size-4 text-inherit" />
                                <span>Chat</span>
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>

                          <DropdownMenuSeparator />

                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => window.location.href = `/dashboard/inquiries/${agent.id}`}>
                              <span className="flex items-center gap-x-2">
                                <RiUserLine className="size-4 text-inherit" />
                                <span>User Inquiries</span>
                              </span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => window.location.href = `/dashboard/errors/${agent.id}`}>
                              <span className="flex items-center gap-x-2">
                                <RiErrorWarningLine className="size-4 text-inherit" />
                                <span>Errors</span>
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem 
                            onClick={() => setAgentToDelete(agent)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <span className="flex items-center gap-x-2">
                              <RiDeleteBinLine className="size-4 text-inherit" />
                              <span>Delete</span>
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center py-8 text-center">
              <div className="flex flex-col items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No agents yet.
                </p>
                <Button 
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setIsDrawerOpen(true)}
                >
                  <RiAddLine className="mr-2 h-4 w-4" />
                  Create New Agent
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {selectedAgent ? (
          <AgentSettings 
            agent={selectedAgent}
            onSave={async (data) => {
              // Handle saving agent settings
              try {
                const response = await fetch(`/api/chatbots/${selectedAgent.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });
                
                if (!response.ok) throw new Error('Failed to update agent');
                
                toast.success("Settings saved successfully");
                
                // Refresh agent details
                const updatedAgent = await fetchAgentDetails(selectedAgent.id);
                if (updatedAgent) {
                  setSelectedAgent(updatedAgent);
                }
              } catch (error) {
                console.error('Error updating agent:', error);
                toast.error("Failed to save settings");
              }
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <LinkAIAgentIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {agents.length > 0 
                  ? 'Select an Agent' 
                  : 'Welcome to Agents'}
              </h1>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {agents.length > 0 
                  ? 'Select an agent from the sidebar or create a new one to get started.' 
                  : 'Create your first agent to enhance your business operations.'}
              </p>
              <Button className="mt-6" onClick={() => setIsDrawerOpen(true)}>
                <RiAddLine className="mr-2 h-4 w-4" />
                Create New Agent
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!agentToDelete} onOpenChange={(open) => {
        // Only allow closing if not in the middle of deleting
        if (!open && deleteStatus !== 'deleting') {
          setAgentToDelete(null);
          setDeleteStatus('idle');
          setDeleteError(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this agent? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deleteStatus === 'success' && (
            <div className="my-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <span>Agent deleted successfully!</span>
              </div>
            </div>
          )}
          
          {deleteStatus === 'error' && (
            <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{deleteError || 'Failed to delete agent. Please try again.'}</span>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button
                variant="secondary"
                className="mt-2 w-full sm:mt-0 sm:w-fit"
                onClick={() => {
                  setAgentToDelete(null);
                  setDeleteStatus('idle');
                  setDeleteError(null);
                }}
                disabled={deleteStatus === 'deleting'}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button 
              variant="destructive"
              className="w-full sm:w-fit"
              onClick={() => handleDeleteAgent(agentToDelete?.id || '')}
              disabled={deleteStatus !== 'idle' && deleteStatus !== 'error'}
            >
              {deleteStatus === 'deleting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : deleteStatus === 'success' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Deleted
                </>
              ) : (
                'Delete Agent'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateAgentDrawer 
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreateAgent={handleCreateAgent}
      />
    </div>
  );
} 