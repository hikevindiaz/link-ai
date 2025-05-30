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
import { 
  RiMoreFill, 
  RiArrowLeftLine, 
  RiAddLine, 
  RiDatabase2Line, 
  RiChatSmileAiLine, 
  RiPhoneLine,
  RiMessage2Line,
  RiSignalTowerLine,
  RiBrainLine,
  RiVoiceAiLine,
  RiBrushAiLine,
  RiUserLine,
  RiErrorWarningLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiClipboardLine
} from "@remixicon/react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AgentSettings } from "@/components/agents/agent-settings";
import type { Agent } from "@/types/agent";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { logger } from "@/lib/logger";

// Define a simplified agent type for the list view
interface SimpleAgent {
  id: string;
  name: string;
  status: 'live' | 'draft';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _logged?: boolean; // Add tracking property for logging state
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
    temperature: chatbot.temperature,
    maxPromptTokens: chatbot.maxPromptTokens,
    maxCompletionTokens: chatbot.maxCompletionTokens,
    // Include channel fields
    websiteEnabled: chatbot.websiteEnabled,
    whatsappEnabled: chatbot.whatsappEnabled,
    smsEnabled: chatbot.smsEnabled,
    messengerEnabled: chatbot.messengerEnabled,
    instagramEnabled: chatbot.instagramEnabled,
    // Include widget fields
    chatTitle: chatbot.chatTitle,
    riveOrbColor: chatbot.riveOrbColor,
    borderGradientColors: chatbot.borderGradientColors,
    iconType: chatbot.iconType || 'orb',
    chatbotLogoURL: chatbot.chatbotLogoURL || null,
    // Include knowledge sources if available
    knowledgeSources: chatbot.knowledgeSources ? chatbot.knowledgeSources.map((source: any) => ({
      id: source.id,
      name: source.name,
      description: source.description,
      vectorStoreId: source.vectorStoreId
    })) : []
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

// Custom TabNavigation components
const TabNavigation: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => {
  return (
    <nav className={cn("flex border-b", className)}>
      {children}
    </nav>
  );
};

const TabNavigationLink: React.FC<{ 
  children: React.ReactNode, 
  href: string, 
  className?: string,
  onClick?: (e: React.MouseEvent) => void
}> = ({ children, href, className, onClick }) => {
  return (
    <a 
      href={href} 
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
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
  
  // Add states for tooltip functionality
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyTooltip, setCopyTooltip] = useState("Copy agent ID");

  // Add mobile responsiveness state
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [showAgentDetailsOnMobile, setShowAgentDetailsOnMobile] = useState<boolean>(false);

  // Tab state for agent settings
  const [activeTab, setActiveTab] = useState('agent');

  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768); // Use 768px as breakpoint
    };
    
    // Initial check
    checkMobileView();
    
    // Set up listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);
  
  // Update mobile view state when agent is selected
  useEffect(() => {
    if (selectedAgent && isMobileView) {
      setShowAgentDetailsOnMobile(true);
    }
    // If not on mobile, always hide the details view initially if agent selection changes
    if (!isMobileView) {
      setShowAgentDetailsOnMobile(false);
    }
  }, [selectedAgent, isMobileView]);

  useEffect(() => {
    fetchAgents();
  }, [session?.user?.id]);

  const fetchAgents = async () => {
    if (!session?.user?.id) return;
    
    try {
      setIsLoading(true);
      logger.info('Fetching agents for user', { userId: session.user.id }, 'agent-listing');
      
      const response = await fetch(`/api/chatbots?userId=${session.user.id}`);
      
      if (!response.ok) throw new Error('Failed to fetch agents');
      
      const data = await response.json();
      logger.debug('Response data', { data }, 'agent-listing');
      
      // Check if data is an object with chatbots property (new API format)
      if (data && data.success && Array.isArray(data.chatbots)) {
        logger.debug('Found chatbots array in response', null, 'agent-listing');
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
        logger.debug('Using direct array response', null, 'agent-listing');
        setAgents(data.filter((agent: any) => agent.userId === session.user?.id));
      } else {
        logger.error('Unexpected data format', { data }, 'agent-listing');
        setAgents([]);
      }
    } catch (error) {
      logger.error('Error fetching agents', { error }, 'agent-listing');
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

    // Clear selected agent if it was deleted and hide details on mobile
    if (selectedAgent?.id === id) {
      setSelectedAgent(null);
      setShowAgentDetailsOnMobile(false); 
    }
  };

  const fetchAgentDetails = async (agentId: string) => {
    try {
      const response = await fetch(`/api/chatbots/${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch agent details');
      
      const data = await response.json();
      logger.debug('Fetched agent details', { 
        agentId,
        responseDataRaw: JSON.stringify(data).substring(0, 500) + "..." // Log partial raw response
      }, 'agent-details');
      
      console.log('[AgentPage] Raw API response contains channel fields:', {
        websiteEnabled: data.websiteEnabled,
        whatsappEnabled: data.whatsappEnabled,
        smsEnabled: data.smsEnabled,
        messengerEnabled: data.messengerEnabled,
        instagramEnabled: data.instagramEnabled
      });
      
      // Convert the chatbot data to our Agent type
      const agent = convertToAgent(data);
      
      console.log('[AgentPage] Converted agent contains channel fields:', {
        websiteEnabled: agent.websiteEnabled,
        whatsappEnabled: agent.whatsappEnabled,
        smsEnabled: agent.smsEnabled,
        messengerEnabled: agent.messengerEnabled,
        instagramEnabled: agent.instagramEnabled
      });
      
      // Ensure knowledgeSources is properly included with vectorStoreId
      if (data.knowledgeSources && Array.isArray(data.knowledgeSources)) {
        agent.knowledgeSources = data.knowledgeSources.map(source => ({
          id: source.id,
          name: source.name,
          description: source.description,
          vectorStoreId: source.vectorStoreId
        }));
        
        logger.debug('Processed knowledge sources', { 
          count: agent.knowledgeSources.length 
        }, 'agent-details');
      }
      
      return agent;
    } catch (error) {
      logger.error('Error fetching agent details', { error }, 'agent-details');
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

  // Add tab change handler
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Function to map page tab values to component tab values
  const mapTabToComponentTab = (pageTab: string) => {
    const tabMapping: Record<string, string> = {
      'agent': 'linkRep',
      'channels': 'channels',
      'llm': 'llm',
      'call': 'call',
      'add-ons': 'actions'
    };
    return tabMapping[pageTab] || 'linkRep';
  };
  
  // Custom styling for active tab
  const getTabClassName = (tabName: string) => {
    const baseClasses = "inline-flex gap-2 items-center";
    const activeClasses = "text-indigo-600 font-medium border-b-2 border-indigo-600 dark:text-indigo-500 dark:border-indigo-500";
    const inactiveClasses = "text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-700";
    
    // Add mobile-specific classes
    const mobileClasses = isMobileView ? "py-2 px-3 text-sm" : "py-3 px-3";
    
    return cn(
      baseClasses,
      mobileClasses,
      activeTab === tabName ? activeClasses : inactiveClasses
    );
  };

  // Handle copying agent ID
  const handleCopyAgentId = () => {
    if (!selectedAgent) return;
    
    navigator.clipboard.writeText(selectedAgent.id)
      .then(() => {
        setCopySuccess(true);
        setCopyTooltip("Copied!");
        setTimeout(() => {
          setCopySuccess(false);
          setCopyTooltip("Copy agent ID");
        }, 2000);
      })
      .catch(() => {
        toast.error("Failed to copy ID");
      });
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Conditionally Rendered */}
      {(!isMobileView || (isMobileView && !showAgentDetailsOnMobile)) && (
        <div className={cn("border-r border-gray-200 dark:border-gray-800 flex flex-col", 
          isMobileView ? "w-full" : "w-80")}>
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
                {agents.map((agent, index) => {
                  // Check if this agent's ID matches the selected agent (for debugging)
                  const isSelected = selectedAgent?.id === agent.id;
                  
                  // Only log the first time an agent is selected
                  if (isSelected && !agent._logged) {
                    logger.debug('Agent selected in sidebar', {
                      agentId: agent.id,
                      selectedId: selectedAgent.id
                    }, 'matching');
                    
                    // Mark this agent as logged to avoid repeated logs
                    agent._logged = true;
                  }
                  
                  return (
                    <Card 
                      key={agent.id} 
                      asChild 
                      className={cn(
                        "group transition-all duration-200",
                        "hover:bg-gray-50 dark:hover:bg-gray-900",
                        "hover:shadow-sm",
                        "hover:border-gray-300 dark:hover:border-gray-700",
                        isSelected && [
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
                              isSelected && [
                                "border-2 border-indigo-500 dark:border-indigo",
                                "shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                              ]
                            )}
                            aria-hidden={true}
                          >
                            {getInitials(agent.name)}
                          </span>
                          <div className="truncate min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "truncate text-sm font-medium text-gray-900 dark:text-gray-50",
                                isSelected && "text-indigo-600 dark:text-indigo-400"
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
                            </div>
                            
                            <div className="mt-0.5">
                              <p className="text-xs text-gray-500 dark:text-gray-500 pointer-events-none no-underline">
                                ID: {agent.id}
                              </p>
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
                  );
                })}
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
      )}

      {/* Main Content - Conditionally Rendered */}
      {(!isMobileView || (isMobileView && showAgentDetailsOnMobile)) && (
        <div className="flex-1 overflow-auto overflow-x-hidden">
          {/* Mobile Back Button */}
          {isMobileView && showAgentDetailsOnMobile && selectedAgent && (
            <div className="sticky top-0 z-10 bg-background border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center px-4 py-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAgentDetailsOnMobile(false)}
                  className="mr-2 text-gray-600 dark:text-gray-300 p-1 h-auto"
                >
                  <RiArrowLeftLine className="h-5 w-5" />
                </Button>
                <h2 className="text-sm font-medium flex-1 truncate">Back to agents</h2>
              </div>
            </div>
          )}
          
          {selectedAgent ? (
            <div className="flex flex-col w-full overflow-x-hidden">
              {/* Updated Header with rearranged layout */}
              <div className={cn("p-4 sm:p-6", isMobileView && "pt-3")}>
                <div className="flex flex-col space-y-3 sm:space-y-4">
                  {/* Title and Badge Row */}
                  <div className="flex flex-wrap items-center justify-between gap-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h1 className={cn(
                        "text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white",
                        isMobileView && "pr-2"
                      )}>
                        {selectedAgent.name}
                      </h1>
                      
                      {/* Status Badge - moved next to agent name */}
                      <Badge 
                        variant={selectedAgent.status === 'live' ? 'primary' : 'secondary'}
                        className={cn(
                          "flex items-center gap-1 px-2 py-0.5 font-medium w-fit",
                          selectedAgent.status === 'live' 
                            ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" 
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        {selectedAgent.status === 'live' ? (
                          <>
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span>Live</span>
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                            <span>Draft</span>
                          </>
                        )}
                      </Badge>
                    </div>
                    
                    {/* Talk to your agent button - aligned to the right */}
                    <div className="flex-shrink-0 ml-auto">
                      <Button 
                        onClick={() => handleAgentChat(selectedAgent.id)}
                        className={cn(
                          "gap-1.5 whitespace-nowrap",
                          isMobileView && "h-8 text-sm px-3"
                        )}
                      >
                        <RiChatSmileAiLine className="h-4 w-4" />
                        {isMobileView ? "Talk to agent" : "Talk to your agent"}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Agent ID with copy button - more compact */}
                  <div className="flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-6 w-6 p-0 transition-colors duration-200 ${
                              copySuccess 
                                ? "text-green-500 bg-green-50 hover:text-green-600 dark:bg-green-900/20 dark:text-green-400" 
                                : "text-gray-500 hover:text-indigo-600"
                            }`}
                            onClick={handleCopyAgentId}
                          >
                            {copySuccess ? (
                              <RiCheckLine className="h-3.5 w-3.5" />
                            ) : (
                              <RiClipboardLine className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{copyTooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <code className={cn(
                      "text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-gray-700 dark:text-gray-300",
                      isMobileView ? "max-w-[120px] sm:max-w-xs truncate" : "max-w-xs overflow-x-auto"
                    )}>
                      {selectedAgent.id}
                    </code>
                  </div>
                </div>
              </div>
              
              {/* Full-width tab navigation */}
              <div className="-mx-6">
                <TabNavigation className="text-sm pl-4 border-b border-gray-200 dark:border-gray-800">
                  <div className={cn(
                    "px-4 sm:px-6 flex overflow-x-auto scrollbar-none"
                  )}>
                    {/* Agent Tab */}
                    <TabNavigationLink
                      href="#" 
                      className={getTabClassName('agent')}
                      onClick={(e) => { e.preventDefault(); handleTabChange('agent'); }}
                    >
                      <LinkAIAgentIcon className="size-4" aria-hidden="true" />
                      <span className={cn(isMobileView && "whitespace-nowrap")}>Agent</span>
                    </TabNavigationLink>
                    
                    {/* LLM Tab */}
                    <TabNavigationLink
                      href="#"
                      className={getTabClassName('llm')}
                      onClick={(e) => { e.preventDefault(); handleTabChange('llm'); }}
                    >
                      <RiBrainLine className="size-4" aria-hidden="true" />
                      <span className={cn(isMobileView && "whitespace-nowrap")}>LLM</span>
                    </TabNavigationLink>
                    
                    {/* Channels Tab */}
                    <TabNavigationLink
                      href="#"
                      className={getTabClassName('channels')}
                      onClick={(e) => { e.preventDefault(); handleTabChange('channels'); }}
                    >
                      <RiSignalTowerLine className="size-4" aria-hidden="true" />
                      <span className={cn(isMobileView && "whitespace-nowrap")}>Channels</span>
                    </TabNavigationLink>
                    
                    {/* Call Tab */}
                    <TabNavigationLink
                      href="#"
                      className={getTabClassName('call')}
                      onClick={(e) => { e.preventDefault(); handleTabChange('call'); }}
                    >
                      <RiVoiceAiLine className="size-4" aria-hidden="true" />
                      <span className={cn(isMobileView && "whitespace-nowrap")}>Call</span>
                    </TabNavigationLink>
                    
                    {/* Actions Tab (previously Add-Ons) */}
                    <TabNavigationLink
                      href="#"
                      className={getTabClassName('add-ons')}
                      onClick={(e) => { e.preventDefault(); handleTabChange('add-ons'); }}
                    >
                      <RiBrushAiLine className="size-4" aria-hidden="true" />
                      <span className={cn(isMobileView && "whitespace-nowrap")}>Actions</span>
                    </TabNavigationLink>
                  </div>
                </TabNavigation>
              </div>
              
              {/* Agent Settings */}
              <div className={cn(
                "px-0 mt-0 w-full overflow-hidden",
                isMobileView && "px-4"
              )}>
                <AgentSettings 
                  key={selectedAgent.id}
                  agent={selectedAgent}
                  showHeader={false}
                  showTabs={false}
                  activeTab={mapTabToComponentTab(activeTab)}
                  onSave={async (data) => {
                    // Handle saving agent settings
                    try {
                      logger.info('Saving agent settings', { 
                        agentId: selectedAgent.id,
                        updatedFields: Object.keys(data)
                      }, 'agent-update');
                      
                      // Log the specific data being sent for channel settings
                      if (data.websiteEnabled !== undefined) {
                        console.log('[AgentPage] Saving channel settings:', {
                          websiteEnabled: data.websiteEnabled,
                          whatsappEnabled: data.whatsappEnabled,
                          instagramEnabled: data.instagramEnabled,
                          messengerEnabled: data.messengerEnabled,
                          smsEnabled: data.smsEnabled
                        });
                      }
                      
                      const response = await fetch(`/api/chatbots/${selectedAgent.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                      });
                      
                      if (!response.ok) throw new Error('Failed to update agent');
                      
                      const updatedData = await response.json();
                      logger.debug('Updated agent response received', { 
                        agentId: selectedAgent.id
                      }, 'agent-update');
                      
                      // Log the updated data for channel settings
                      if (data.websiteEnabled !== undefined) {
                        console.log('[AgentPage] Updated agent channel settings:', {
                          websiteEnabled: updatedData.websiteEnabled,
                          whatsappEnabled: updatedData.whatsappEnabled,
                          instagramEnabled: updatedData.instagramEnabled,
                          messengerEnabled: updatedData.messengerEnabled,
                          smsEnabled: updatedData.smsEnabled
                        });
                      }
                      
                      toast.success("Settings saved successfully");
                      
                      // After saving, re-fetch the agent details to ensure UI is in sync with DB
                      const refreshedAgent = await fetchAgentDetails(selectedAgent.id);
                      if (refreshedAgent) {
                        logger.debug('Refreshed agent data after save', {
                          agentId: refreshedAgent.id,
                          websiteEnabled: refreshedAgent.websiteEnabled,
                          whatsappEnabled: refreshedAgent.whatsappEnabled,
                          instagramEnabled: refreshedAgent.instagramEnabled,
                          messengerEnabled: refreshedAgent.messengerEnabled,
                          smsEnabled: refreshedAgent.smsEnabled
                        }, 'agent-refresh');
                        
                        // Update the selected agent with fresh data from the server
                        setSelectedAgent(refreshedAgent);
                      }
                      
                      // Process the returned data to ensure it has all required fields
                      const updatedAgent = {
                        ...selectedAgent,
                        ...data,
                        // Make sure knowledgeSources is properly included
                        knowledgeSources: updatedData.knowledgeSources || data.knowledgeSources || []
                      };
                      
                      logger.debug('Processed updated agent', { 
                        agentId: updatedAgent.id,
                        name: updatedAgent.name
                      }, 'agent-update');
                      
                      // Make sure the agent list reflects the name change immediately
                      setAgents(prevAgents => 
                        prevAgents.map(a => a.id === updatedAgent.id ? { ...a, name: updatedAgent.name, status: updatedAgent.status || 'draft' } : a)
                      );

                      return updatedAgent;
                    } catch (error) {
                      logger.error('Error updating agent', { error }, 'agent-update');
                      toast.error("Failed to save settings");
                      throw error;
                    }
                  }}
                />
              </div>
            </div>
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
      )}

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