import { Message } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { Overview } from './overview';
import { memo, useEffect } from 'react';
import equal from 'fast-deep-equal';
import Image from 'next/image';
import { UserIcon } from 'lucide-react';

// Extend the Message type from Vercel AI SDK to include required fields
interface ChatMessage extends Message {
  id: string;
}

// Export the interface
export interface MessagesProps {
  chatId: string;
  status: 'error' | 'submitted' | 'streaming' | 'ready';
  messages: Array<ChatMessage>;
  setMessages: (messages: ChatMessage[] | ((messages: ChatMessage[]) => ChatMessage[])) => void;
  reload: (options?: any) => Promise<string>;
  isReadonly: boolean;
  isArtifactVisible: boolean;
  chatbotId: string;
  chatbotLogoURL?: string | null;
  welcomeMessage?: string | null;
}

function PureMessages({
  chatId,
  status,
  messages,
  setMessages,
  reload,
  isReadonly,
  chatbotId,
  chatbotLogoURL,
  welcomeMessage,
}: MessagesProps) {
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const UserAvatar = ({ email }: { email?: string }) => {
    if (email) {
      return (
        <Image 
          src={`https://avatar.vercel.sh/${email}`} 
          alt="User" 
          width={40} 
          height={40}
          className="rounded-full"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.style.display = 'none';
            target.parentElement!.classList.add('fallback-avatar');
          }}
        />
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
        <UserIcon className="w-6 h-6 text-neutral-500" />
      </div>
    );
  };

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
    >
      {messages.length === 0 && 
        <Overview 
          chatbotId={chatbotId} 
          chatbotLogoURL={chatbotLogoURL} 
          welcomeMessage={welcomeMessage} 
        />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
        />
      ))}

      {/* Show "Thinking..." message when in submitted state and last message is from user */}
      {status === 'submitted' && 
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && (
          <ThinkingMessage 
            isStreaming={false} 
            userQuery={messages[messages.length - 1].content}
            agentId={chatbotId}
            toolInvocations={(() => {
              // Try to find toolInvocations in the most recent assistant message
              const lastAssistantMessage = messages.slice().reverse().find(m => m.role === 'assistant');
              return lastAssistantMessage?.toolInvocations;
            })()}
          />
      )}

      {/* Also show ThinkingMessage in streaming state for better user feedback */}
      {status === 'streaming' && 
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && (
          <ThinkingMessage 
            isStreaming={true}
            userQuery={messages[messages.length - 1].content}
            agentId={chatbotId}
            toolInvocations={(() => {
              // Check the last message (might be assistant with toolInvocations)
              const lastMessage = messages[messages.length - 1];
              const lastAssistantMessage = messages.slice().reverse().find(m => m.role === 'assistant');
              
              // Try last message first, then last assistant message
              return lastMessage?.toolInvocations || lastAssistantMessage?.toolInvocations;
            })()}
          />
      )}

      {/* Show ThinkingMessage during streaming when assistant is responding */}
      {status === 'streaming' && 
        messages.length > 0 &&
        messages[messages.length - 1].role === 'assistant' && (
          <ThinkingMessage 
            isStreaming={true}
            agentId={chatbotId}
            userQuery={(() => {
              // Find the most recent user message
              const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
              return lastUserMessage?.content;
            })()}
            toolInvocations={messages[messages.length - 1].toolInvocations}
          />
      )}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  // Always re-render if status changes - this is critical for UI updates
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  
  // Always re-render if message count changes
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  
  // CRITICAL: Handle streaming optimization FIRST before doing expensive equality checks
  if (nextProps.status === 'streaming' && prevProps.status === 'streaming') {
    const prevLastMessage = prevProps.messages[prevProps.messages.length - 1];
    const nextLastMessage = nextProps.messages[nextProps.messages.length - 1];
    
    if (prevLastMessage && nextLastMessage && prevLastMessage.id === nextLastMessage.id) {
      const contentLengthDiff = Math.abs((nextLastMessage.content?.length || 0) - (prevLastMessage.content?.length || 0));
      const hasStructuralChange = !equal(prevLastMessage.toolInvocations, nextLastMessage.toolInvocations);
      
      // During streaming, only re-render every 100 characters or on structural changes
      if (contentLengthDiff < 100 && !hasStructuralChange) {
        return true; // Skip re-render for small content changes during streaming
      } else {
        // Allow re-render for significant changes
        return false;
      }
    }
  }
  
  // Only do expensive equality check if NOT in streaming mode
  if (nextProps.status !== 'streaming' || prevProps.status !== 'streaming') {
  if (!equal(prevProps.messages, nextProps.messages)) {
    return false;
  }
  }
  
  // Re-render if other important props change
  if (prevProps.chatbotLogoURL !== nextProps.chatbotLogoURL) return false;
  if (prevProps.welcomeMessage !== nextProps.welcomeMessage) return false;
  if (prevProps.isArtifactVisible !== nextProps.isArtifactVisible) return false;
  
  // Default to preventing unnecessary re-renders
  return true;
});
