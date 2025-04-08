import { Message } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { Overview } from './overview';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import Image from 'next/image';
import { UserIcon } from 'lucide-react';

// Define the Vote interface to match what's expected
interface Vote {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
}

// Extend the Message type from Vercel AI SDK to include required fields
interface ChatMessage extends Message {
  id: string;
}

interface MessagesProps {
  chatId: string;
  status: 'error' | 'submitted' | 'streaming' | 'ready';
  votes: Array<Vote> | undefined;
  messages: Array<ChatMessage>;
  setMessages: (messages: ChatMessage[] | ((messages: ChatMessage[]) => ChatMessage[])) => void;
  reload: (options?: any) => Promise<string>;
  isReadonly: boolean;
  isArtifactVisible: boolean;
  chatbotLogoURL?: string | null;
  welcomeMessage?: string | null;
}

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
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
      {messages.length === 0 && <Overview chatbotLogoURL={chatbotLogoURL} welcomeMessage={welcomeMessage} />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
        />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.status && nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (prevProps.chatbotLogoURL !== nextProps.chatbotLogoURL) return false;
  if (prevProps.welcomeMessage !== nextProps.welcomeMessage) return false;

  return true;
});
