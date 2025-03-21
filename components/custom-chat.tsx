"use client"

import { OpenAssistantGPTChat } from 'openassistantgpt'
import { Message } from 'openassistantgpt'
import { useState, useEffect } from 'react'
import styles from './custom-chat.module.css'
import { ClientSideChatbotProps } from './chat-sdk'

interface CustomChatProps {
  chatbot: ClientSideChatbotProps;
  defaultMessage?: string;
  className?: string;
  withExitX?: boolean;
  clientSidePrompt?: string;
}

export function CustomChat({ 
  chatbot, 
  defaultMessage = "", 
  className = "", 
  withExitX = false, 
  clientSidePrompt = "",
  ...props 
}: CustomChatProps) {
  const [count, setMessagesCount] = useState(0);
  const [threadId, setThreadId] = useState('');
  
  function handleMessagesChange(messages: Message[]) {
    setMessagesCount(messages.length);
  }

  function handleThreadIdChange(threadId: string | undefined) {
    setThreadId(threadId || '');
  }

  // Apply custom styling to override library defaults
  useEffect(() => {
    // This will run after the component mounts
    // We could add additional DOM manipulation here if needed
    const chatContainer = document.querySelector('[class*="chat-container"]');
    if (chatContainer) {
      chatContainer.classList.add('custom-styled');
    }
  }, []);

  return (
    <div className={`${styles.customChatWrapper} ${className}`}>
      <OpenAssistantGPTChat 
        chatbot={{
          ...chatbot,
          // Override colors to match our design
          chatbotReplyBackgroundColor: '#FFFFFF',
          chatbotReplyTextColor: '#000000',
          userReplyBackgroundColor: '#000000',
          userReplyTextColor: '#FFFFFF',
          chatHeaderBackgroundColor: '#FFFFFF',
          chatHeaderTextColor: '#000000',
          displayFooterText: chatbot.displayBranding,
          footerLink: 'https://getlinkai.com',
          footerTextName: 'Link AI',
          chatbotLogoURL: chatbot.chatbotLogoURL || '',
        }} 
        path={`/api/chatbots/${chatbot.id}/chat`} 
        withExitX={withExitX} 
        clientSidePrompt={clientSidePrompt} 
        defaultMessage={defaultMessage} 
        {...props} 
        onMessagesChange={handleMessagesChange}
        onThreadIdChange={handleThreadIdChange}
        style={{ 
          backgroundColor: "#f9f9f9", // Light gray background for the chat
        }}
      />
    </div>
  )
} 