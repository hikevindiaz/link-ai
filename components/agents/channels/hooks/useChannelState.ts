import { useState, useEffect } from 'react';
import { Agent } from '@/types/agent';
import { logger } from '../logger';

// Channel state type
export interface ChannelState {
  websiteEnabled: boolean;
  whatsappEnabled: boolean;
  instagramEnabled: boolean;
  messengerEnabled: boolean;
  smsEnabled: boolean;
}

// Interface for the hook params
interface UseChannelStateParams {
  agent: Agent;
  onChange?: (state: ChannelState, isDirty: boolean) => void;
}

/**
 * Hook to manage channel states and dirty tracking
 */
export function useChannelState({ agent, onChange }: UseChannelStateParams) {
  // Initialize channel states
  const [websiteEnabled, setWebsiteEnabled] = useState(agent.websiteEnabled || false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(agent.whatsappEnabled || false);
  const [instagramEnabled, setInstagramEnabled] = useState(agent.instagramEnabled || false);
  const [messengerEnabled, setMessengerEnabled] = useState(agent.messengerEnabled || false);
  const [smsEnabled, setSmsEnabled] = useState(agent.smsEnabled || false);
  
  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);
  
  // Sync with agent data when it changes
  useEffect(() => {
    setWebsiteEnabled(agent.websiteEnabled || false);
    setWhatsappEnabled(agent.whatsappEnabled || false);
    setInstagramEnabled(agent.instagramEnabled || false);
    setMessengerEnabled(agent.messengerEnabled || false);
    setSmsEnabled(agent.smsEnabled || false);
    
    // Reset dirty state when agent changes
    setIsDirty(false);
  }, [agent]);
  
  // Check for changes when any channel state changes
  useEffect(() => {
    const hasChanged = 
      websiteEnabled !== (agent.websiteEnabled || false) ||
      whatsappEnabled !== (agent.whatsappEnabled || false) ||
      instagramEnabled !== (agent.instagramEnabled || false) ||
      messengerEnabled !== (agent.messengerEnabled || false) ||
      smsEnabled !== (agent.smsEnabled || false);
      
    if (hasChanged !== isDirty) {
      setIsDirty(hasChanged);
      
      // Call onChange if provided
      if (onChange) {
        onChange(getState(), hasChanged);
      }
      
      logger.debug('useChannelState', 'Channel state dirty status changed', { isDirty: hasChanged });
    }
  }, [
    agent, 
    websiteEnabled, 
    whatsappEnabled, 
    instagramEnabled, 
    messengerEnabled, 
    smsEnabled,
    isDirty,
    onChange
  ]);
  
  // Generic handler for channel toggling
  const toggleChannel = (channel: keyof ChannelState, enabled: boolean) => {
    logger.debug('useChannelState', `Toggling ${channel}`, { enabled });
    
    switch (channel) {
      case 'websiteEnabled':
        setWebsiteEnabled(enabled);
        break;
      case 'whatsappEnabled':
        setWhatsappEnabled(enabled);
        break;
      case 'instagramEnabled':
        setInstagramEnabled(enabled);
        break;
      case 'messengerEnabled':
        setMessengerEnabled(enabled);
        break;
      case 'smsEnabled':
        setSmsEnabled(enabled);
        break;
    }
  };
  
  // Reset to initial values (for cancel)
  const resetToInitial = () => {
    setWebsiteEnabled(agent.websiteEnabled || false);
    setWhatsappEnabled(agent.whatsappEnabled || false);
    setInstagramEnabled(agent.instagramEnabled || false);
    setMessengerEnabled(agent.messengerEnabled || false);
    setSmsEnabled(agent.smsEnabled || false);
    setIsDirty(false);
  };
  
  // Helper to get complete state
  const getState = (): ChannelState => ({
    websiteEnabled,
    whatsappEnabled,
    instagramEnabled,
    messengerEnabled,
    smsEnabled
  });
  
  return {
    // Exposed states
    websiteEnabled,
    whatsappEnabled,
    instagramEnabled,
    messengerEnabled,
    smsEnabled,
    isDirty,
    
    // Actions
    toggleChannel,
    resetToInitial,
    
    // State getter
    getState
  };
} 