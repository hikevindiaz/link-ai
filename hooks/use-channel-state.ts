import { useState, useEffect, useCallback } from 'react';
import { Agent } from '@/types/agent';

/**
 * Type for channel state
 */
export interface ChannelState {
  websiteEnabled: boolean;
  whatsappEnabled: boolean;
  instagramEnabled: boolean;
  messengerEnabled: boolean;
  smsEnabled: boolean;
}

/**
 * Hook to manage channel enablement state
 */
export function useChannelState(agent: Agent) {
  // Initialize channel state from agent
  const [channels, setChannels] = useState<ChannelState>({
    websiteEnabled: agent.websiteEnabled || false,
    whatsappEnabled: agent.whatsappEnabled || false,
    instagramEnabled: agent.instagramEnabled || false,
    messengerEnabled: agent.messengerEnabled || false,
    smsEnabled: agent.smsEnabled || false,
  });
  
  // Track if channel state has changed
  const [hasChanged, setHasChanged] = useState(false);
  
  // Track the last saved state
  const [lastSavedState, setLastSavedState] = useState({
    websiteEnabled: agent.websiteEnabled || false,
    whatsappEnabled: agent.whatsappEnabled || false,
    instagramEnabled: agent.instagramEnabled || false,
    messengerEnabled: agent.messengerEnabled || false,
    smsEnabled: agent.smsEnabled || false,
  });
  
  // Reset channel state when agent changes
  useEffect(() => {
    const newState = {
      websiteEnabled: agent.websiteEnabled || false,
      whatsappEnabled: agent.whatsappEnabled || false,
      instagramEnabled: agent.instagramEnabled || false,
      messengerEnabled: agent.messengerEnabled || false,
      smsEnabled: agent.smsEnabled || false,
    };
    
    setChannels(newState);
    setLastSavedState(newState);
    
    // Reset changed state
    setHasChanged(false);
    
    // Log the reset for debugging
    console.log("useChannelState: Reset state from agent", {
      id: agent.id,
      websiteEnabled: agent.websiteEnabled,
      whatsappEnabled: agent.whatsappEnabled
    });
  }, [agent]); // Now depends on the entire agent object, not just the ID
  
  // Listen for 'settingsSaved' event to reset dirty state
  useEffect(() => {
    const handleSettingsSaved = (event: CustomEvent) => {
      // Check if this event is for our agent
      if (event.detail?.agentId === agent.id) {
        console.log("useChannelState: Received settingsSaved event", {
          agentId: agent.id
        });
        
        // Reset changed state
        setHasChanged(false);
      }
    };
    
    // Add event listener
    window.addEventListener('settingsSaved' as any, handleSettingsSaved);
    
    // Clean up
    return () => {
      window.removeEventListener('settingsSaved' as any, handleSettingsSaved);
    };
  }, [agent.id]);
  
  // Update channel state
  const updateChannel = useCallback((channel: keyof ChannelState, enabled: boolean) => {
    setChannels(prev => {
      const updated = { ...prev, [channel]: enabled };
      
      // Check if any channel state has changed
      const channelChanged = 
        updated.websiteEnabled !== (agent.websiteEnabled || false) ||
        updated.whatsappEnabled !== (agent.whatsappEnabled || false) ||
        updated.instagramEnabled !== (agent.instagramEnabled || false) ||
        updated.messengerEnabled !== (agent.messengerEnabled || false) ||
        updated.smsEnabled !== (agent.smsEnabled || false);
      
      // Update changed state
      setHasChanged(channelChanged);
      
      return updated;
    });
    
    return true;
  }, [agent]);
  
  // Get a merged object with agent data and channel state
  const getMergedData = useCallback(() => {
    return {
      ...channels
    };
  }, [channels]);
  
  // Reset to agent values
  const resetToAgent = useCallback(() => {
    const newState = {
      websiteEnabled: agent.websiteEnabled || false,
      whatsappEnabled: agent.whatsappEnabled || false,
      instagramEnabled: agent.instagramEnabled || false,
      messengerEnabled: agent.messengerEnabled || false,
      smsEnabled: agent.smsEnabled || false,
    };
    
    setChannels(newState);
    setLastSavedState(newState);
    
    // Reset changed state
    setHasChanged(false);
    
    return true;
  }, [agent]);
  
  return {
    channels,
    hasChanged,
    updateChannel,
    getMergedData,
    resetToAgent
  };
} 