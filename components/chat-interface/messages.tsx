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

  // Debug log on status change to help diagnose issues
  useEffect(() => {
    console.log(`[Messages] Status changed to: ${status}, message count: ${messages.length}`);
  }, [status, messages.length]);

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
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
        <UserIcon className="w-6 h-6 text-gray-500" />
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
          <ThinkingMessage />
      )}

      {/* Also show ThinkingMessage in streaming state for better user feedback */}
      {status === 'streaming' && 
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && (
          <ThinkingMessage />
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
    console.log(`[Messages Memo] Re-rendering due to status change: ${prevProps.status} -> ${nextProps.status}`);
    return false;
  }
  
  // Always re-render if message count changes
  if (prevProps.messages.length !== nextProps.messages.length) {
    console.log(`[Messages Memo] Re-rendering due to message count change: ${prevProps.messages.length} -> ${nextProps.messages.length}`);
    return false;
  }
  
  // Always re-render if messages content changed
  if (!equal(prevProps.messages, nextProps.messages)) {
    console.log('[Messages Memo] Re-rendering due to message content change');
    return false;
  }
  
  // If artifact visibility changed but other properties didn't, optimize render
  if (prevProps.isArtifactVisible !== nextProps.isArtifactVisible) {
    const shouldSkipRender = prevProps.messages.length === nextProps.messages.length &&
      equal(prevProps.messages, nextProps.messages) &&
      prevProps.status === nextProps.status;
    
    if (shouldSkipRender) {
      console.log('[Messages Memo] Skipping render for artifact visibility change only');
    }
    return shouldSkipRender;
  }
  
  // Re-render if other important props change
  if (prevProps.chatbotLogoURL !== nextProps.chatbotLogoURL) return false;
  if (prevProps.welcomeMessage !== nextProps.welcomeMessage) return false;
  
  // Default to preventing unnecessary re-renders
  return true;
});
