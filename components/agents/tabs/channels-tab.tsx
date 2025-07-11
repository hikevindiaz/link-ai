import { useState, useEffect } from "react"
import { Accordion } from "@/components/ui/accordion"
import { Globe } from "lucide-react"
import {
  RiWhatsappLine,
  RiMessengerLine,
  RiInstagramLine,
  RiChat1Line
} from '@remixicon/react'
import type { Agent } from "@/types/agent"
import { WebsiteWidgetConfig } from "@/components/agents/channels/website-widget-config"
import { ChannelItem } from "@/components/agents/channels/channel-item"
import { ChannelPreview } from "@/components/agents/channels/ChannelPreview"
import { SaveChangesHandler } from "@/components/agents/channels/SaveChangesHandler"
import { useChannelState } from "@/hooks/use-channel-state"
import { useWidgetSettings } from "@/hooks/use-widget-settings"
import { useThemeSync } from "@/hooks/use-theme-sync"
import { logger } from "@/components/agents/channels/logger"

interface ChannelsTabProps {
  agent: Agent;
  onSave: (data: Partial<Agent>) => Promise<Agent>;
}

export function ChannelsTab({ agent, onSave }: ChannelsTabProps) {
  // Use our custom hooks for state management
  const { channels, hasChanged: channelsHasChanged, updateChannel, resetToAgent: resetChannels } = useChannelState(agent);
  const { settings, hasChanged: settingsHasChanged, updateSettings, handleLogoChange, clearLogo, resetToAgent: resetSettings } = useWidgetSettings(agent);
  const { buttonTheme, bubbleColor, bubbleTextColor, chatBackgroundColor, handleThemeChange } = useThemeSync(agent);
  
  // Track logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Set up preview settings combining our various state
  const previewSettings = {
    buttonTheme,
    bubbleColor,
    bubbleTextColor,
    chatBackgroundColor,
    riveOrbColor: settings.riveOrbColor,
    borderGradientColors: settings.borderGradientColors,
    chatTitle: settings.chatTitle,
    iconType: settings.iconType,
    logoUrl: settings.chatbotLogoURL,
    displayBranding: settings.displayBranding,
    fileAttachmentEnabled: settings.chatFileAttachementEnabled
  };
  
  // Log initialization for debugging
  useEffect(() => {
    logger.debug("ChannelsTab", "Component initialized", {
      id: agent.id,
      hasChannels: !!channels,
      hasSettings: !!settings
    });
  }, [agent.id, channels, settings]);
  
  // Handle widget settings change from WebsiteWidgetConfig
  const handleWidgetChange = (data: any) => {
    logger.debug("ChannelsTab", "Widget change received", { 
      hasData: !!data,
      fields: Object.keys(data)
    });
    
    // Special case for icon type changes
    if (data.iconType) {
      logger.debug("ChannelsTab", "Icon type change detected", { 
        newIconType: data.iconType,
        previousIconType: settings.iconType
      });
      
      // Explicitly update icon type in settings
      updateSettings({
        ...data,
        fromUserInteraction: true
      });
      
      // If switching to orb mode, ensure preview updates immediately
      if (data.iconType === 'orb') {
        // Update preview directly for immediate feedback
        handleSettingsPreviewChange({
          iconType: 'orb',
          logoUrl: null,
          riveOrbColor: settings.riveOrbColor
        });
      }
      
      return;
    }
    
    // Special case for logo changes
    if (data.selectedLogoFile !== undefined) {
      handleLogoChange(
        data.selectedLogoFile, 
        data.selectedLogoFile ? URL.createObjectURL(data.selectedLogoFile) : null
      );
    }
    // Theme changes
    else if (data.buttonTheme || data.bubbleColor || data.bubbleTextColor || data.chatBackgroundColor) {
      // Use our theme sync hook for consistent theme handling
      handleThemeChange(data.buttonTheme || buttonTheme);
    }
    // All other changes
    else {
      // Mark as user interaction if appropriate
      const fromUser = data.fromUserInteraction === true;
      updateSettings({ 
        ...data, 
        fromUserInteraction: fromUser
      });
    }
  };
  
  // Settings changed callback for live preview
  const handleSettingsPreviewChange = (data: any) => {
    // Create a preview event
    const event = new CustomEvent('widgetSettingsChange', { 
      detail: {
        ...data,
        fromUserInteraction: true,
        fromInitialLoad: false
      } 
    });
    window.dispatchEvent(event as any);
  };
  
  // Logo upload/clear handlers
  const handleLogoSelected = (file: File | null) => {
    // Create a preview URL if needed
    const previewUrl = file ? URL.createObjectURL(file) : null;
    
    // Update settings via our hook
    handleLogoChange(file, previewUrl);
    
    // Always update preview too
    handleSettingsPreviewChange({ 
      iconType: 'logo', 
      logoUrl: previewUrl 
    });
  };
  
  const handleClearLogo = () => {
    // Clear logo via our hook
    clearLogo();
    
    // Update preview
    handleSettingsPreviewChange({ 
      iconType: 'logo', 
      logoUrl: null 
    });
  };

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-200px)]">
      <Accordion type="multiple" className="w-full">
        {/* Website Channel */}
        <ChannelItem
          id="website"
          name="Website"
          description="Configure website chat widget"
          icon={<Globe className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
          enabled={channels.websiteEnabled}
          onToggle={(enabled) => updateChannel('websiteEnabled', enabled)}
        >
          <WebsiteWidgetConfig 
            agent={agent} 
            onWidgetChange={handleWidgetChange}
            onSettingsChange={handleSettingsPreviewChange}
            isUploadingLogo={isUploadingLogo}
          />
        </ChannelItem>

        {/* WhatsApp Channel */}
        <ChannelItem
          id="whatsapp"
          name="WhatsApp"
          description="Configure WhatsApp integration"
          icon={<RiWhatsappLine className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
          enabled={channels.whatsappEnabled}
          onToggle={(enabled) => updateChannel('whatsappEnabled', enabled)}
          disabled={true}
          isComingSoon={true}
        >
          <div className="space-y-4 animate-in slide-in-from-top-5 duration-300 px-4 py-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              WhatsApp integration will be available soon.
            </p>
          </div>
        </ChannelItem>

        {/* Instagram Channel */}
        <ChannelItem
          id="instagram"
          name="Instagram"
          description="Configure Instagram integration"
          icon={<RiInstagramLine className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
          enabled={channels.instagramEnabled}
          onToggle={(enabled) => updateChannel('instagramEnabled', enabled)}
          disabled={true}
          isComingSoon={true}
        >
          <div className="space-y-4 animate-in slide-in-from-top-5 duration-300 px-4 py-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Instagram integration will be available soon.
            </p>
          </div>
        </ChannelItem>

        {/* Messenger Channel */}
        <ChannelItem
          id="messenger"
          name="Messenger"
          description="Configure Messenger integration"
          icon={<RiMessengerLine className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
          enabled={channels.messengerEnabled}
          onToggle={(enabled) => updateChannel('messengerEnabled', enabled)}
          disabled={true}
          isComingSoon={true}
        />

        {/* SMS Channel */}
        <ChannelItem
          id="sms"
          name="SMS"
          description="Configure SMS integration"
          icon={<RiChat1Line className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
          enabled={channels.smsEnabled}
          onToggle={(enabled) => updateChannel('smsEnabled', enabled)}
          disabled={true}
          isComingSoon={true}
        />
      </Accordion>

      {/* Save Changes Handler */}
      <SaveChangesHandler
        agent={agent}
        onSave={onSave}
        widgetSettingsHasChanged={settingsHasChanged}
        channelsHasChanged={channelsHasChanged}
        widgetSettings={{
          ...settings,
          buttonTheme,
          bubbleColor,
          bubbleTextColor,
          chatBackgroundColor
        }}
        channels={channels}
        onResetWidgetSettings={resetSettings}
        onResetChannels={resetChannels}
      />
      
      {/* Live floating widget preview */}
      <ChannelPreview 
        agent={agent} 
        isEnabled={channels.websiteEnabled}
        overrideSettings={previewSettings}
      />
    </div>
  );
} 