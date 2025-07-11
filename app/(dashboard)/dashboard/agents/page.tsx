'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
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
  RiClipboardLine,
  RiDraftLine,
  RiCheckboxCircleLine
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
import RiveGlint from "@/components/chat-interface/rive-glint";

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
    // Include Call tab fields
    phoneNumber: chatbot.phoneNumber,
    voice: chatbot.voice,
    responseRate: chatbot.responseRate,
    checkUserPresence: chatbot.checkUserPresence,
    presenceMessage: chatbot.presenceMessage,
    presenceMessageDelay: chatbot.presenceMessageDelay,
    silenceTimeout: chatbot.silenceTimeout,
    hangUpMessage: chatbot.hangUpMessage,
    callTimeout: chatbot.callTimeout,
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
    chatMessagePlaceHolder: chatbot.chatMessagePlaceHolder,
    chatInputStyle: chatbot.chatInputStyle,
    chatHistoryEnabled: chatbot.chatHistoryEnabled,
    bubbleColor: chatbot.bubbleColor,
    bubbleTextColor: chatbot.bubbleTextColor,
    chatBackgroundColor: chatbot.chatBackgroundColor,
    buttonTheme: chatbot.buttonTheme,
    chatHeaderBackgroundColor: chatbot.chatHeaderBackgroundColor,
    chatHeaderTextColor: chatbot.chatHeaderTextColor,
    userReplyBackgroundColor: chatbot.userReplyBackgroundColor,
    userReplyTextColor: chatbot.userReplyTextColor,
    displayBranding: chatbot.displayBranding,
    chatFileAttachementEnabled: chatbot.chatFileAttachementEnabled,
    // Include knowledge sources if available
    knowledgeSources: chatbot.knowledgeSources ? chatbot.knowledgeSources.map((source: any) => ({
      id: source.id,
      name: source.name,
      description: source.description,
      vectorStoreId: source.vectorStoreId
    })) : [],
    // Include Actions tab fields
    calendarEnabled: chatbot.calendarEnabled,
    calendarId: chatbot.calendarId,
    aviationStackEnabled: chatbot.aviationStackEnabled
  };
}

const colorCombinations = [
  { text: 'text-neutral-800 dark:text-neutral-200', bg: 'bg-neutral-100 dark:bg-neutral-800' },
  { text: 'text-neutral-700 dark:text-neutral-300', bg: 'bg-neutral-200 dark:bg-neutral-700' },
  { text: 'text-neutral-800 dark:text-neutral-200', bg: 'bg-neutral-150 dark:bg-neutral-750' },
  { text: 'text-neutral-900 dark:text-neutral-100', bg: 'bg-neutral-100 dark:bg-neutral-800' },
  { text: 'text-neutral-700 dark:text-neutral-300', bg: 'bg-neutral-200 dark:bg-neutral-700' },
  { text: 'text-neutral-800 dark:text-neutral-200', bg: 'bg-neutral-100 dark:bg-neutral-800' },
  { text: 'text-neutral-700 dark:text-neutral-300', bg: 'bg-neutral-200 dark:bg-neutral-700' },
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Agent Status Badge Component
function AgentStatusBadge({ agent, compact = false }: { agent: Agent; compact?: boolean }) {
  const hasPrompt = agent.prompt && agent.prompt.trim().length > 0;
  
  if (compact) {
    // Compact version for list items
    const compactClasses = "text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1";
    
    if (hasPrompt) {
      return (
        <div className={`${compactClasses} bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400`}>
          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
          <span>Active</span>
        </div>
      );
    }
    
    return (
      <div className={`${compactClasses} bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400`}>
        <div className="h-1.5 w-1.5 rounded-full bg-neutral-500"></div>
        <span>Draft</span>
      </div>
    );
  }
  
  // Regular version for headers
  const baseClasses = "flex items-center gap-1 px-3 py-1 font-medium";
  
  if (hasPrompt) {
    return (
      <Badge variant="secondary" className={`${baseClasses} bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400`}>
        <RiCheckboxCircleLine className="h-3.5 w-3.5" />
        <span>Active</span>
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className={`${baseClasses} bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400`}>
      <RiDraftLine className="h-3.5 w-3.5" />
      <span>Draft</span>
    </Badge>
  );
}

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

// Add skeleton loading component after the imports
const AgentSkeleton = () => (
  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
    <div className="flex items-center">
      <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
      <div className="ml-3 flex-1">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2"></div>
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-3/4"></div>
      </div>
    </div>
  </div>
);

export default function TestChatbotPage() {
  const { data: session } = useSession();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<SimpleAgent[]>([]);
  const [agentPrompts, setAgentPrompts] = useState<Record<string, string>>({});
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
      
      let agentsList: any[] = [];
      
      // Check if data is an object with chatbots property (new API format)
      if (data && data.success && Array.isArray(data.chatbots)) {
        logger.debug('Found chatbots array in response', null, 'agent-listing');
        agentsList = data.chatbots;
      } else if (Array.isArray(data)) {
        // Legacy format - direct array
        logger.debug('Using direct array response', null, 'agent-listing');
        agentsList = data.filter((agent: any) => agent.userId === session.user?.id);
      } else {
        logger.error('Unexpected data format', { data }, 'agent-listing');
        setAgents([]);
        return;
      }
      
      // Set agents list
      setAgents(agentsList.map((chatbot: any) => ({
        id: chatbot.id,
        name: chatbot.name,
        status: chatbot.isLive ? 'live' : 'draft',
        userId: session.user?.id || '',
        createdAt: new Date(chatbot.createdAt),
        updatedAt: new Date(chatbot.updatedAt)
      })));
      
      // Extract prompts for status badges
      const prompts: Record<string, string> = {};
      agentsList.forEach((chatbot: any) => {
        prompts[chatbot.id] = chatbot.prompt || '';
      });
      setAgentPrompts(prompts);
      
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
    const activeClasses = "text-black font-medium border-b-2 border-black dark:text-white dark:border-white";
    const inactiveClasses = "text-neutral-500 hover:text-black hover:border-b-2 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-white dark:hover:border-neutral-700";
    
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
        <div className={cn("border-r border-neutral-200 dark:border-neutral-800 flex flex-col", 
          isMobileView ? "w-full" : "w-80")}>
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black dark:text-white">
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
              <div className="grid grid-cols-1 gap-2 mt-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <AgentSkeleton key={index} />
                ))}
              </div>
            ) : agents.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 mt-2">
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
                  
                  // Create agent object with prompt for badge
                  const agentForBadge = { ...agent, prompt: agentPrompts[agent.id] || '' } as Agent;
                  
                  return (
                    <div 
                      key={agent.id} 
                      onClick={() => handleAgentSelect(agent)}
                      className={cn(
                        "group transition-all duration-200 cursor-pointer p-3 rounded-xl border relative",
                        "hover:bg-neutral-50 dark:hover:bg-neutral-900",
                        "hover:shadow-sm",
                        "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800",
                        "hover:border-neutral-300 dark:hover:border-neutral-700",
                        isSelected && [
                          "border-neutral-400 dark:border-white",
                          "bg-neutral-50 dark:bg-neutral-900"
                        ]
                      )}
                    >
                      <div className="flex items-center">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium">
                          {getInitials(agent.name)}
                        </span>
                        <div className="ml-3 w-full overflow-hidden">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center max-w-[85%]">
                              <div className="truncate text-sm font-medium text-black dark:text-white">
                                {agent.name}
                              </div>
                            </div>
                          </div>
                          <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400">
                            ID: {agent.id}
                          </p>
                        </div>
                      </div>

                      <div className="absolute right-2 top-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <RiMoreFill className="h-3.5 w-3.5 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300" />
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
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center py-8 text-center">
                <Card className="p-6 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                  <div className="flex flex-col items-center max-w-md">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                      <LinkAIAgentIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-black dark:text-white mb-1">
                      Create your first agent
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                      Build AI agents that can chat with customers and help grow your business.
                    </p>
                    <Button size="sm" onClick={() => setIsDrawerOpen(true)}>
                      Create new agent
                    </Button>
                  </div>
                </Card>
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
            <div className="sticky top-0 z-10 bg-background border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center px-4 py-2.5">
                                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAgentDetailsOnMobile(false)}
                    className="mr-2 text-black dark:text-white p-1 h-auto"
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
                        "text-xl sm:text-2xl font-semibold text-black dark:text-white",
                        isMobileView && "pr-2"
                      )}>
                        {selectedAgent.name}
                      </h1>
                      
                      {/* Prompt-based Status Badge */}
                      <AgentStatusBadge agent={selectedAgent} />
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
                        <RiveGlint 
                          isSpeaking={true}
                          className="w-4 h-4"
                        />
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
                                : "text-neutral-500 hover:text-black dark:hover:text-white"
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
                      "text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-mono text-black dark:text-white",
                      isMobileView ? "max-w-[120px] sm:max-w-xs truncate" : "max-w-xs overflow-x-auto"
                    )}>
                      {selectedAgent.id}
                    </code>
                  </div>
                </div>
              </div>
              
              {/* Full-width tab navigation */}
              <div className="-mx-6">
                <TabNavigation className="text-sm pl-4 border-b border-neutral-200 dark:border-neutral-800">
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
              <Card className="p-6 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <div className="mx-auto max-w-lg text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <LinkAIAgentIcon className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <h1 className="text-lg font-semibold text-black dark:text-white mb-2">
                    {agents.length > 0 
                      ? 'Select an agent' 
                      : 'Create your first agent'}
                  </h1>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    {agents.length > 0 
                      ? 'Choose an agent from the sidebar to view and manage its settings.' 
                      : 'Build AI agents that can chat with customers and help grow your business.'}
                  </p>
                  <Button onClick={() => setIsDrawerOpen(true)}>
                    Create new agent
                  </Button>
                </div>
              </Card>
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
            <DialogDescription className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              Are you sure you want to delete this agent? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deleteStatus === 'success' && (
            <div className="my-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <span>Agent deleted successfully!</span>
              </div>
            </div>
          )}
          
          {deleteStatus === 'error' && (
            <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
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