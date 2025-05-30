import { useState, useEffect, useCallback } from 'react';
import { Agent } from '@/types/agent';
import { RAINBOW_COLORS, RIVE_COLORS } from '../theme-utils';
import { logger } from '../logger';
import { z } from 'zod';
import { websiteWidgetSchema } from '../website-widget-config';

// Base widget config data type
export type WidgetConfigData = z.infer<typeof websiteWidgetSchema>;

// Extended type with additional properties for internal use
export interface ExtendedWidgetConfigData extends Partial<WidgetConfigData> {
  selectedLogoFile?: File | null;
  fromUserInteraction?: boolean;
  fromInitialLoad?: boolean;
}

// Preview settings that should be updated when widget settings change
export interface PreviewSettings {
  previewRiveOrbColor: number;
  previewBorderGradientColors: string[];
  previewTitle: string;
  previewMessage: string;
  previewIconType: 'orb' | 'logo';
  previewLogoUrl: string | null;
  previewDisplayBranding: boolean;
  previewFileAttachmentEnabled: boolean;
}

interface UseWidgetSettingsParams {
  agent: Agent;
  onSettingsChange?: (settings: ExtendedWidgetConfigData, isDirty: boolean) => void;
}

/**
 * Hook to manage widget settings state and changes
 */
export function useWidgetSettings({ agent, onSettingsChange }: UseWidgetSettingsParams) {
  // Current widget settings state
  const [currentSettings, setCurrentSettings] = useState<ExtendedWidgetConfigData | null>(null);
  
  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);
  
  // Preview state for the widget
  const [previewRiveOrbColor, setPreviewRiveOrbColor] = useState<number>(agent.riveOrbColor ?? RIVE_COLORS.BLACK);
  const [previewBorderGradientColors, setPreviewBorderGradientColors] = useState<string[]>(
    agent.borderGradientColors || RAINBOW_COLORS
  );
  const [previewTitle, setPreviewTitle] = useState<string>(agent.name || "Agent");
  const [previewMessage, setPreviewMessage] = useState<string>(
    agent.chatTitle && agent.chatTitle !== '2' ? agent.chatTitle : "Hi, let's talk"
  );
  const [previewIconType, setPreviewIconType] = useState<'orb' | 'logo'>(
    agent.iconType || (agent.chatbotLogoURL ? 'logo' : 'orb')
  );
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(agent.chatbotLogoURL || null);
  const [previewDisplayBranding, setPreviewDisplayBranding] = useState<boolean>(agent.displayBranding ?? true);
  const [previewFileAttachmentEnabled, setPreviewFileAttachmentEnabled] = useState<boolean>(
    agent.chatFileAttachementEnabled ?? false
  );
  
  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Force re-render key for components that need to refresh
  const [renderKey, setRenderKey] = useState(0);
  
  // Initialize settings from agent data
  useEffect(() => {
    const initialSettings: ExtendedWidgetConfigData = {
      // Widget settings from agent
      riveOrbColor: agent.riveOrbColor ?? RIVE_COLORS.BLACK,
      borderGradientColors: agent.borderGradientColors || RAINBOW_COLORS,
      chatTitle: agent.chatTitle && agent.chatTitle !== '2' ? agent.chatTitle : "Hi, let's chat!",
      iconType: agent.iconType || (agent.chatbotLogoURL ? 'logo' : 'orb'),
      chatbotLogoURL: agent.chatbotLogoURL,
      displayBranding: agent.displayBranding ?? true,
      chatFileAttachementEnabled: agent.chatFileAttachementEnabled ?? false,
      
      // Flag this as initial load
      fromInitialLoad: true,
      fromUserInteraction: false
    };
    
    setCurrentSettings(initialSettings);
    
    // Also update preview states
    setPreviewRiveOrbColor(initialSettings.riveOrbColor as number);
    setPreviewBorderGradientColors(initialSettings.borderGradientColors as string[]);
    setPreviewTitle(agent.name || "Agent");
    setPreviewMessage(initialSettings.chatTitle as string);
    setPreviewIconType(initialSettings.iconType as 'orb' | 'logo');
    setPreviewLogoUrl(initialSettings.chatbotLogoURL as string | null);
    setPreviewDisplayBranding(initialSettings.displayBranding as boolean);
    setPreviewFileAttachmentEnabled(initialSettings.chatFileAttachementEnabled as boolean);
    
    // Reset dirty state when agent changes
    setIsDirty(false);
    
    logger.debug('useWidgetSettings', 'Initialized settings from agent', initialSettings);
  }, [agent]);
  
  // Handle settings updates
  const updateSettings = useCallback((newSettings: ExtendedWidgetConfigData) => {
    logger.debug('useWidgetSettings', 'Updating settings', newSettings);
    
    // Mark as dirty if update is from user interaction
    if (newSettings.fromUserInteraction) {
      setIsDirty(true);
    }
    
    // Update the current settings
    setCurrentSettings(prev => {
      const merged = { ...(prev || {}), ...newSettings };
      
      // Call the onChange callback if provided
      if (onSettingsChange) {
        onSettingsChange(merged, true);
      }
      
      return merged;
    });
    
    // Force re-render
    setRenderKey(prev => prev + 1);
    
    // Update preview states based on the new settings
    if (newSettings.riveOrbColor !== undefined) {
      setPreviewRiveOrbColor(newSettings.riveOrbColor);
    }
    
    if (newSettings.borderGradientColors) {
      setPreviewBorderGradientColors(newSettings.borderGradientColors);
    }
    
    if (newSettings.chatTitle) {
      setPreviewMessage(newSettings.chatTitle);
    }
    
    if (newSettings.iconType) {
      setPreviewIconType(newSettings.iconType);
    }
    
    if ('chatbotLogoURL' in newSettings) {
      setPreviewLogoUrl(newSettings.chatbotLogoURL || null);
    }
    
    if (newSettings.displayBranding !== undefined) {
      setPreviewDisplayBranding(newSettings.displayBranding);
    }
    
    if (newSettings.chatFileAttachementEnabled !== undefined) {
      setPreviewFileAttachmentEnabled(newSettings.chatFileAttachementEnabled);
    }
    
    return newSettings;
  }, [onSettingsChange]);
  
  // Handle widget settings event changes
  const handleWidgetSettingsEvent = useCallback((event: CustomEvent) => {
    const settings = event.detail;
    if (settings) {
      updateSettings({
        ...settings,
        fromUserInteraction: true,
        fromInitialLoad: false
      });
    }
  }, [updateSettings]);
  
  // Setup event listener for widget settings changes
  useEffect(() => {
    window.addEventListener('widgetSettingsChange' as any, handleWidgetSettingsEvent);
    return () => {
      window.removeEventListener('widgetSettingsChange' as any, handleWidgetSettingsEvent);
    };
  }, [handleWidgetSettingsEvent]);
  
  // Reset to initial values
  const resetToInitial = () => {
    // Re-initialize from agent data
    const initialSettings: ExtendedWidgetConfigData = {
      riveOrbColor: agent.riveOrbColor ?? RIVE_COLORS.BLACK,
      borderGradientColors: agent.borderGradientColors || RAINBOW_COLORS,
      chatTitle: agent.chatTitle && agent.chatTitle !== '2' ? agent.chatTitle : "Hi, let's chat!",
      iconType: agent.iconType || (agent.chatbotLogoURL ? 'logo' : 'orb'),
      chatbotLogoURL: agent.chatbotLogoURL,
      displayBranding: agent.displayBranding ?? true,
      chatFileAttachementEnabled: agent.chatFileAttachementEnabled ?? false,
      
      // Flag this as initial load
      fromInitialLoad: true,
      fromUserInteraction: false
    };
    
    setCurrentSettings(initialSettings);
    setIsDirty(false);
    
    // Reset preview states
    setPreviewRiveOrbColor(initialSettings.riveOrbColor as number);
    setPreviewBorderGradientColors(initialSettings.borderGradientColors as string[]);
    setPreviewTitle(agent.name || "Agent");
    setPreviewMessage(initialSettings.chatTitle as string);
    setPreviewIconType(initialSettings.iconType as 'orb' | 'logo');
    setPreviewLogoUrl(initialSettings.chatbotLogoURL as string | null);
    setPreviewDisplayBranding(initialSettings.displayBranding as boolean);
    setPreviewFileAttachmentEnabled(initialSettings.chatFileAttachementEnabled as boolean);
    
    logger.debug('useWidgetSettings', 'Reset to initial settings', initialSettings);
  };
  
  // Helper to get current settings
  const getSettings = (): ExtendedWidgetConfigData => {
    return currentSettings || {};
  };
  
  // Helper to get preview settings
  const getPreviewSettings = (): PreviewSettings => ({
    previewRiveOrbColor,
    previewBorderGradientColors,
    previewTitle,
    previewMessage,
    previewIconType,
    previewLogoUrl,
    previewDisplayBranding,
    previewFileAttachmentEnabled
  });
  
  return {
    // Settings state
    currentSettings,
    isDirty,
    renderKey,
    isUploadingLogo,
    
    // Preview state
    previewRiveOrbColor,
    previewBorderGradientColors,
    previewTitle,
    previewMessage,
    previewIconType, 
    previewLogoUrl,
    previewDisplayBranding,
    previewFileAttachmentEnabled,
    
    // Actions
    updateSettings,
    resetToInitial,
    setIsUploadingLogo,
    
    // State getters
    getSettings,
    getPreviewSettings
  };
} 