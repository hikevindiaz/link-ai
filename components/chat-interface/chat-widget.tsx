// components/chat-interface/chat-widget.tsx
'use client';

import { useState } from 'react';
import { Chat } from './chat';
import { Message } from 'ai';

interface ChatWidgetProps {
  chatbotId: string;
  chatTitle?: string;
  chatbotLogoURL?: string;
  chatHeaderBackgroundColor?: string;
  chatHeaderTextColor?: string;
  chatBackgroundColor?: string;
  chatbotReplyBackgroundColor?: string;
  chatbotReplyTextColor?: string;
  userReplyBackgroundColor?: string;
  userReplyTextColor?: string;
}

export function ChatWidget({
  chatbotId,
  chatTitle = 'AI Assistant',
  chatbotLogoURL,
  chatHeaderBackgroundColor = '#FFFFFF',
  chatHeaderTextColor = '#000000',
  chatBackgroundColor = '#F9F9F9',
  chatbotReplyBackgroundColor = '#FFFFFF',
  chatbotReplyTextColor = '#000000',
  userReplyBackgroundColor = '#000000',
  userReplyTextColor = '#FFFFFF',
}: ChatWidgetProps) {
  const [initialMessages] = useState<Message[]>([]);

  // Apply the custom colors as CSS variables
  const containerStyle = {
    '--chat-header-background': chatHeaderBackgroundColor,
    '--chat-header-foreground': chatHeaderTextColor,
    '--chat-background': chatBackgroundColor,
    '--chat-bot-reply-background': chatbotReplyBackgroundColor,
    '--chat-bot-reply-foreground': chatbotReplyTextColor,
    '--chat-user-reply-background': userReplyBackgroundColor,
    '--chat-user-reply-foreground': userReplyTextColor,
  } as React.CSSProperties;

  return (
    <div className="h-full w-full" style={containerStyle}>
      <Chat
        id={chatbotId}
        initialMessages={initialMessages}
        selectedChatModel="gpt-4"
        selectedVisibilityType="private"
        isReadonly={false}
        chatbotId={chatbotId}
        chatbotLogoURL={chatbotLogoURL}
        chatTitle={chatTitle}
      />
    </div>
  );
}
