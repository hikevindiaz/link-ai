'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { RefreshCw, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";
import { Divider } from "@/components/Divider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select";
import { useToast } from "@/components/ui/use-toast";
import React from "react";

// Import components
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatThread } from "@/components/inbox/ChatThread";
import { EmptyThreadState } from "@/components/inbox/EmptyThreadState";

// Import types
import { Conversation, Agent } from "@/types/inbox";

export default function InboxPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");
  const { toast: uiToast } = useToast();
  const [knownThreadIds, setKnownThreadIds] = useState<string[]>([]);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  
  // Add state to track if we're in mobile view
  const [isMobileView, setIsMobileView] = useState(false);
  const [showConversationOnMobile, setShowConversationOnMobile] = useState(false);
  
  // Function to fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    
    try {
      // Build URL with query parameter if a specific agent is selected.
      const url = new URL('/api/inbox', window.location.origin);
      if (selectedAgentFilter !== "all") {
        url.searchParams.set("agentId", selectedAgentFilter);
      }
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      
      // Get the current thread IDs from the response
      const currentThreadIds = data.map((conv: Conversation) => conv.id);
      
      // Check if there are new threads compared to what we had before
      if (knownThreadIds.length > 0) {
        const hasNewThreads = currentThreadIds.some((id: string) => !knownThreadIds.includes(id));
        
        // If there are new threads, dispatch a custom event to update the sidebar badge
        if (hasNewThreads) {
          const newMessageEvent = new CustomEvent('newInboxMessage');
          window.dispatchEvent(newMessageEvent);
        }
      }
      
      // Always update our known thread IDs
      setKnownThreadIds(currentThreadIds);
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, selectedAgentFilter, knownThreadIds]);

  // Fetch available agents for the user
  useEffect(() => {
    const fetchAgents = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch('/api/chatbots');
        if (!res.ok) throw new Error("Failed to fetch agents");
        const data = await res.json();
        // Ensure data is an array before setting it to agents state
        setAgents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching agents:", error);
        setAgents([]);
      }
    };
    fetchAgents();
  }, [session?.user?.id]);

  useEffect(() => {
    fetchConversations();
  }, [session?.user?.id, selectedAgentFilter]);

  // Set up polling to check for new messages, but only if we're in the inbox view
  useEffect(() => {
    // Only set up the interval if this component is mounted
    const intervalId = setInterval(fetchConversations, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [selectedAgentFilter, fetchConversations]);

  // Listen for the clearSelectedConversation event
  useEffect(() => {
    const handleClearSelectedConversation = () => {
      setSelectedConversation(null);
    };
    
    window.addEventListener('clearSelectedConversation', handleClearSelectedConversation);
    
    return () => {
      window.removeEventListener('clearSelectedConversation', handleClearSelectedConversation);
    };
  }, []);

  // Listen for thread deletion events
  useEffect(() => {
    const handleThreadDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const deletedThreadId = customEvent.detail?.threadId;
      
      // Fetch updated conversations and select the next one
      const updateConversations = async () => {
        try {
          // Build URL with query parameter if a specific agent is selected
          const url = new URL('/api/inbox', window.location.origin);
          if (selectedAgentFilter !== "all") {
            url.searchParams.set("agentId", selectedAgentFilter);
          }
          
          // Fetch the updated list of conversations
          const response = await fetch(url.toString());
          if (!response.ok) throw new Error('Failed to fetch conversations');
          const updatedConversations = await response.json();
          
          // Update the conversations state
          setConversations(updatedConversations);
          
          // If we have conversations available, select the first one
          if (updatedConversations.length > 0) {
            setSelectedConversation(updatedConversations[0]);
          } else {
            // If no conversations are available, set to null
            setSelectedConversation(null);
          }
        } catch (error) {
          console.error('Error fetching conversations after deletion:', error);
          uiToast({
            title: "Error",
            description: "Failed to update conversations list"
          });
        }
      };
      
      // Update conversations and select the next one
      updateConversations();
    };
    
    window.addEventListener('inboxThreadDeleted', handleThreadDeleted);
    
    return () => {
      window.removeEventListener('inboxThreadDeleted', handleThreadDeleted);
    };
  }, [selectedAgentFilter]);

  // Refresh conversations when clicking the refresh button
  const handleRefresh = async () => {
    await fetchConversations();
  };

  // Add a function to mark all conversations as read
  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRead || conversations.length === 0) return;
    
    setIsMarkingAllRead(true);
    
    try {
      // Call API to mark all as read
      const response = await fetch('/api/inbox/markAllAsRead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          agentId: selectedAgentFilter === "all" ? undefined : selectedAgentFilter 
        }),
      });
      
      if (response.ok) {
        // Update the local state to reflect all conversations as read
        setConversations(prevConversations => 
          prevConversations.map(conv => ({ ...conv, unread: false }))
        );
        
        // Trigger a refresh of the unread count in the sidebar
        const event = new CustomEvent('inboxThreadRead');
        window.dispatchEvent(event);
        
        // Notify success
        uiToast({
          title: "Success",
          description: "All messages marked as read"
        });
      } else {
        console.error('Failed to mark all as read');
        uiToast({
          title: "Error",
          description: "Failed to mark all messages as read"
        });
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      uiToast({
        title: "Error",
        description: "An error occurred"
      });
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobileView();
    
    // Set up listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);
  
  // Update mobile view state when conversation is selected
  useEffect(() => {
    if (isMobileView && selectedConversation) {
      setShowConversationOnMobile(true);
    }
  }, [selectedConversation, isMobileView]);

  // Update the setSelectedConversation function
  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    
    // On mobile, show the conversation panel
    if (isMobileView) {
      setShowConversationOnMobile(true);
    }
    
    // Only make the API call if the conversation is unread
    if (conversation.unread) {
      try {
        const response = await fetch('/api/inbox/markAsRead', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ threadId: conversation.id }),
        });
        
        if (response.ok) {
          // Update the local state to reflect the change
          setConversations(prevConversations => 
            prevConversations.map(conv => 
              conv.id === conversation.id 
                ? { ...conv, unread: false } 
                : conv
            )
          );
          
          // Trigger a refresh of the unread count in the sidebar
          const event = new CustomEvent('inboxThreadRead');
          window.dispatchEvent(event);
        } else {
          console.error('Failed to mark thread as read');
        }
      } catch (error) {
        console.error('Error marking thread as read:', error);
      }
    }
  };
  
  // Handle going back to the conversation list on mobile
  const handleBackToList = () => {
    setShowConversationOnMobile(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar: Conversations List */}
      {(!isMobileView || (isMobileView && !showConversationOnMobile)) && (
        <div className={`${isMobileView ? 'w-full' : 'w-96'} border-r border-gray-200 dark:border-gray-800 flex flex-col`}>
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                Inbox
              </h2>
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedAgentFilter}
                  onValueChange={(val) => {
                    setSelectedAgentFilter(val);
                    fetchConversations();
                  }}
                >
                  <SelectTrigger className="p-2 border rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 w-30 flex-shrink-0">
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {Array.isArray(agents) && agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Mark all as read button */}
                <Button
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllRead || conversations.filter(c => c.unread).length === 0}
                  title="Mark all as read"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                
                {/* Refresh button */}
                <Button
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  title="Refresh inbox"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
          
          <Divider className="mt-4" />
          
          <ConversationList 
            conversations={conversations}
            isLoading={isLoading}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onRefresh={handleRefresh}
          />
        </div>
      )}

      {/* Main Content: Chat Thread */}
      {(!isMobileView || (isMobileView && showConversationOnMobile)) && (
        <div className="flex-1 overflow-auto">
          {isMobileView && showConversationOnMobile && (
            <div className="border-b border-gray-200 dark:border-gray-800 p-2">
              <Button
                variant="ghost"
                onClick={handleBackToList}
                className="flex items-center text-gray-600 dark:text-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to conversations
              </Button>
            </div>
          )}
          
          {selectedConversation ? (
            <ChatThread conversation={selectedConversation} />
          ) : (
            <EmptyThreadState />
          )}
        </div>
      )}
    </div>
  );
}
