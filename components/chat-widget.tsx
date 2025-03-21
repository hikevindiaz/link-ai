'use client'

import { useState } from 'react'
import { Chat } from './chat'

// Define Message type if you don't have access to the ai package
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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
  const [initialMessages] = useState<Message[]>([])

  return (
    <Chat
      id={chatbotId}
      initialMessages={initialMessages}
      selectedChatModel="gpt-4"
      selectedVisibilityType="private"
      isReadonly={false}
      chatTitle={chatTitle}
      chatbotLogoURL={chatbotLogoURL}
      chatHeaderBackgroundColor={chatHeaderBackgroundColor}
      chatHeaderTextColor={chatHeaderTextColor}
      chatBackgroundColor={chatBackgroundColor}
      chatbotReplyBackgroundColor={chatbotReplyBackgroundColor}
      chatbotReplyTextColor={chatbotReplyTextColor}
      userReplyBackgroundColor={userReplyBackgroundColor}
      userReplyTextColor={userReplyTextColor}
    />
  )
} 