import React, { useState, useEffect } from 'react';
import ChatbotButton from '@/components/chatbot-button';
import { Agent } from '@/types/agent';
import { RIVE_COLORS, RAINBOW_COLORS } from './theme-utils';

interface ChannelPreviewProps {
  agent: Agent;
  isEnabled?: boolean;
  overrideSettings?: {
    buttonTheme?: 'light' | 'dark';
    chatBackgroundColor?: string;
    bubbleColor?: string;
    bubbleTextColor?: string;
    riveOrbColor?: number;
    borderGradientColors?: string[];
    chatTitle?: string;
    iconType?: 'orb' | 'logo';
    logoUrl?: string | null;
    displayBranding?: boolean;
    fileAttachmentEnabled?: boolean;
  };
}

export function ChannelPreview({ agent, isEnabled = true, overrideSettings }: ChannelPreviewProps) {
  // Initialize state with agent defaults or overrides
  const [renderKey, setRenderKey] = useState<number>(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // These values come from either override props or agent defaults
  const buttonTheme = overrideSettings?.buttonTheme || agent.buttonTheme as 'light' | 'dark' || 
    (agent.chatBackgroundColor === "#000000" ? "dark" : "light");
    
  const chatBackgroundColor = overrideSettings?.chatBackgroundColor || agent.chatBackgroundColor || "#FFFFFF";
  const bubbleColor = overrideSettings?.bubbleColor || agent.bubbleColor || "#FFFFFF";
  const bubbleTextColor = overrideSettings?.bubbleTextColor || agent.bubbleTextColor || "#000000";
  const riveOrbColor = overrideSettings?.riveOrbColor ?? agent.riveOrbColor ?? RIVE_COLORS.BLACK;
  const borderGradientColors = overrideSettings?.borderGradientColors || agent.borderGradientColors || RAINBOW_COLORS;
  const title = overrideSettings?.chatTitle || agent.name || "Agent";
  const message = (overrideSettings?.chatTitle || agent.chatTitle) && (overrideSettings?.chatTitle || agent.chatTitle) !== '2' 
    ? (overrideSettings?.chatTitle || agent.chatTitle || "Hi, let's chat!")
    : "Hi, let's chat!";
  const iconType = overrideSettings?.iconType || agent.iconType || (agent.chatbotLogoURL ? 'logo' : 'orb');
  const logoUrl = overrideSettings?.logoUrl !== undefined ? overrideSettings.logoUrl : agent.chatbotLogoURL;
  const displayBranding = overrideSettings?.displayBranding !== undefined ? overrideSettings.displayBranding : (agent.displayBranding ?? true);
  const fileAttachmentEnabled = overrideSettings?.fileAttachmentEnabled !== undefined ? 
    overrideSettings.fileAttachmentEnabled : (agent.chatFileAttachementEnabled ?? false);
  
  // Update the useEffect with more explicit dependencies for icon-related changes
  useEffect(() => {
    // Force re-render when any display property changes
    setRenderKey(prev => prev + 1);
    
    // Log preview updates to help with debugging
    console.log("ChannelPreview: Display properties updated", {
      iconType,
      hasLogo: !!logoUrl,
      buttonTheme
    });
  }, [
    buttonTheme,
    chatBackgroundColor,
    bubbleColor,
    bubbleTextColor,
    riveOrbColor,
    borderGradientColors,
    title,
    message,
    iconType, // Important for icon switching
    logoUrl,
    displayBranding,
    fileAttachmentEnabled,
    isEnabled
  ]);
  
  // Only render the preview if channel is enabled
  if (!isEnabled) {
    return null;
  }
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <ChatbotButton 
        textColor={bubbleTextColor}
        backgroundColor={bubbleColor}
        borderGradient={true}
        borderGradientColors={borderGradientColors}
        title={title}
        message={message}
        useRiveOrb={iconType === 'orb'}
        riveOrbColor={iconType === 'orb' ? riveOrbColor : undefined}
        logoUrl={iconType === 'logo' ? logoUrl : undefined}
        onToggleChat={(isOpen) => setIsChatOpen(isOpen)}
        displayBranding={displayBranding}
        fileAttachmentEnabled={fileAttachmentEnabled}
        chatBackgroundColor={chatBackgroundColor}
        buttonTheme={buttonTheme}
        key={`preview-button-${buttonTheme}-${chatBackgroundColor}-${renderKey}`}
      />
    </div>
  );
} 