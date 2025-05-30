import { useState } from 'react';
import ChatbotButton from '@/components/chatbot-button';
import type { PreviewSettings } from '../hooks/useWidgetSettings';
import type { ThemeData } from '../hooks/useThemeSync';

interface ChannelPreviewProps {
  isVisible: boolean;
  previewSettings: PreviewSettings;
  themeData: ThemeData;
  renderKey: number;
}

/**
 * Floating live preview of the chat widget button
 */
export function ChannelPreview({
  isVisible, 
  previewSettings,
  themeData,
  renderKey
}: ChannelPreviewProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  if (!isVisible) return null;
  
  const {
    previewRiveOrbColor,
    previewBorderGradientColors,
    previewTitle,
    previewMessage,
    previewIconType,
    previewLogoUrl,
    previewDisplayBranding,
    previewFileAttachmentEnabled
  } = previewSettings;
  
  const {
    buttonTheme,
    bubbleColor,
    bubbleTextColor,
    chatBackgroundColor
  } = themeData;
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <ChatbotButton 
        textColor={bubbleTextColor}
        backgroundColor={bubbleColor}
        borderGradient={true}
        borderGradientColors={previewBorderGradientColors}
        title={previewTitle}
        message={previewMessage}
        useRiveOrb={previewIconType === 'orb'}
        riveOrbColor={previewIconType === 'orb' ? previewRiveOrbColor : undefined}
        logoUrl={previewIconType === 'logo' ? previewLogoUrl : undefined}
        onToggleChat={(isOpen) => setIsChatOpen(isOpen)}
        displayBranding={previewDisplayBranding}
        fileAttachmentEnabled={previewFileAttachmentEnabled}
        chatBackgroundColor={chatBackgroundColor}
        buttonTheme={buttonTheme}
        key={`preview-button-${buttonTheme}-${chatBackgroundColor}-${renderKey}`}
      />
    </div>
  );
} 