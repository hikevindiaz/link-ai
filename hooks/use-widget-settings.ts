import { useState, useEffect, useCallback } from 'react';
import { Agent } from '@/types/agent';
import { RIVE_COLORS, RAINBOW_COLORS } from '@/components/agents/channels/theme-utils';

/**
 * Type for widget settings
 */
export interface WidgetSettings {
  chatTitle: string;
  iconType: 'orb' | 'logo';
  riveOrbColor: number;
  borderGradientColors: string[];
  chatbotLogoURL: string | null;
  displayBranding: boolean;
  chatFileAttachementEnabled: boolean;
  selectedLogoFile?: File | null;
  fromUserInteraction?: boolean;
}

/**
 * Hook to manage widget settings state
 */
export function useWidgetSettings(agent: Agent) {
  // Initialize widget settings from agent
  const [settings, setSettings] = useState<WidgetSettings>({
    chatTitle: agent.chatTitle && agent.chatTitle !== '2' ? agent.chatTitle : "Hi, let's chat!",
    iconType: agent.iconType || (agent.chatbotLogoURL ? 'logo' : 'orb'),
    riveOrbColor: agent.riveOrbColor ?? RIVE_COLORS.BLACK,
    borderGradientColors: agent.borderGradientColors || RAINBOW_COLORS,
    chatbotLogoURL: agent.chatbotLogoURL || null,
    displayBranding: agent.displayBranding ?? true,
    chatFileAttachementEnabled: agent.chatFileAttachementEnabled ?? false,
    selectedLogoFile: null,
  });
  
  // Track if settings have changed
  const [hasChanged, setHasChanged] = useState(false);
  
  // Track the last saved state of the agent to detect changes
  const [lastSavedState, setLastSavedState] = useState({
    chatTitle: agent.chatTitle,
    iconType: agent.iconType,
    riveOrbColor: agent.riveOrbColor,
    borderGradientColorsString: JSON.stringify(agent.borderGradientColors),
    chatbotLogoURL: agent.chatbotLogoURL,
    displayBranding: agent.displayBranding,
    chatFileAttachementEnabled: agent.chatFileAttachementEnabled,
  });
  
  // Reset settings when agent changes
  useEffect(() => {
    setSettings({
      chatTitle: agent.chatTitle && agent.chatTitle !== '2' ? agent.chatTitle : "Hi, let's chat!",
      iconType: agent.iconType || (agent.chatbotLogoURL ? 'logo' : 'orb'),
      riveOrbColor: agent.riveOrbColor ?? RIVE_COLORS.BLACK,
      borderGradientColors: agent.borderGradientColors || RAINBOW_COLORS,
      chatbotLogoURL: agent.chatbotLogoURL || null,
      displayBranding: agent.displayBranding ?? true,
      chatFileAttachementEnabled: agent.chatFileAttachementEnabled ?? false,
      selectedLogoFile: null,
    });
    
    // Also update the last saved state
    setLastSavedState({
      chatTitle: agent.chatTitle,
      iconType: agent.iconType,
      riveOrbColor: agent.riveOrbColor,
      borderGradientColorsString: JSON.stringify(agent.borderGradientColors),
      chatbotLogoURL: agent.chatbotLogoURL,
      displayBranding: agent.displayBranding,
      chatFileAttachementEnabled: agent.chatFileAttachementEnabled,
    });
    
    // Reset changed state
    setHasChanged(false);
    
    // Log the reset for debugging
    console.log("useWidgetSettings: Reset state from agent", {
      id: agent.id,
      chatTitle: agent.chatTitle,
      iconType: agent.iconType,
      hasLogo: !!agent.chatbotLogoURL
    });
  }, [agent]); // Now depends on the entire agent object, not just the ID
  
  // Listen for 'settingsSaved' event to reset dirty state
  useEffect(() => {
    const handleSettingsSaved = (event: CustomEvent) => {
      // Check if this event is for our agent
      if (event.detail?.agentId === agent.id) {
        console.log("useWidgetSettings: Received settingsSaved event", {
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
  
  // Update settings
  const updateSettings = useCallback((newSettings: Partial<WidgetSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Mark as changed if this is from user interaction
      if (newSettings.fromUserInteraction) {
        setHasChanged(true);
      }
      
      return updated;
    });
    
    return true;
  }, []);
  
  // Handle special case for logo upload
  const handleLogoChange = useCallback((file: File | null, previewUrl: string | null) => {
    setSettings(prev => ({
      ...prev,
      selectedLogoFile: file,
      chatbotLogoURL: previewUrl,
      iconType: 'logo',
    }));
    
    // Always mark as changed for logo changes
    setHasChanged(true);
    
    return true;
  }, []);
  
  // Clear logo
  const clearLogo = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      selectedLogoFile: null,
      chatbotLogoURL: null,
    }));
    
    // Always mark as changed for logo changes
    setHasChanged(true);
    
    return true;
  }, []);
  
  // Check if settings have changed from agent
  const compareWithAgent = useCallback(() => {
    const hasLogoChanged = 
      (settings.iconType === 'logo' && settings.selectedLogoFile !== null) ||
      (settings.chatbotLogoURL !== agent.chatbotLogoURL);
      
    const hasIconTypeChanged = settings.iconType !== agent.iconType && 
      !(settings.iconType === 'logo' && agent.chatbotLogoURL && !agent.iconType);
      
    const hasChatTitleChanged = settings.chatTitle !== agent.chatTitle;
    
    const hasRiveOrbColorChanged = settings.riveOrbColor !== agent.riveOrbColor;
    
    const hasBorderGradientChanged = 
      !agent.borderGradientColors || 
      JSON.stringify(settings.borderGradientColors) !== JSON.stringify(agent.borderGradientColors);
      
    const hasBrandingChanged = settings.displayBranding !== agent.displayBranding;
    
    const hasFileAttachmentChanged = settings.chatFileAttachementEnabled !== agent.chatFileAttachementEnabled;
    
    const changedFields = {
      logo: hasLogoChanged,
      iconType: hasIconTypeChanged,
      chatTitle: hasChatTitleChanged,
      riveOrbColor: hasRiveOrbColorChanged,
      borderGradient: hasBorderGradientChanged,
      branding: hasBrandingChanged,
      fileAttachment: hasFileAttachmentChanged
    };
    
    const anyChanged = Object.values(changedFields).some(Boolean);
    
    // Update hasChanged state
    if (anyChanged !== hasChanged) {
      setHasChanged(anyChanged);
    }
    
    return {
      hasChanged: anyChanged,
      changedFields
    };
  }, [agent, settings, hasChanged]);
  
  // Reset to agent values
  const resetToAgent = useCallback(() => {
    setSettings({
      chatTitle: agent.chatTitle && agent.chatTitle !== '2' ? agent.chatTitle : "Hi, let's chat!",
      iconType: agent.iconType || (agent.chatbotLogoURL ? 'logo' : 'orb'),
      riveOrbColor: agent.riveOrbColor ?? RIVE_COLORS.BLACK,
      borderGradientColors: agent.borderGradientColors || RAINBOW_COLORS,
      chatbotLogoURL: agent.chatbotLogoURL || null,
      displayBranding: agent.displayBranding ?? true,
      chatFileAttachementEnabled: agent.chatFileAttachementEnabled ?? false,
      selectedLogoFile: null,
    });
    
    // Also update the last saved state
    setLastSavedState({
      chatTitle: agent.chatTitle,
      iconType: agent.iconType,
      riveOrbColor: agent.riveOrbColor,
      borderGradientColorsString: JSON.stringify(agent.borderGradientColors),
      chatbotLogoURL: agent.chatbotLogoURL,
      displayBranding: agent.displayBranding,
      chatFileAttachementEnabled: agent.chatFileAttachementEnabled,
    });
    
    // Reset changed state
    setHasChanged(false);
    
    return true;
  }, [agent]);
  
  return {
    settings,
    hasChanged,
    updateSettings,
    handleLogoChange,
    clearLogo,
    compareWithAgent,
    resetToAgent
  };
} 