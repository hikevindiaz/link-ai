import React from 'react';
import { cn } from '@/lib/utils';
import { ThumbsUp, ThumbsDown, Copy, Check, Bot } from 'lucide-react';
import { Button } from '@/components/chat-interface/ui/button';

// Enhanced markdown renderer component with better formatting support
const SimpleMarkdown = ({ content }: { content: string }) => {
  const formattedContent = content
    // Handle code blocks first (to avoid conflicts with other formatting)
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-neutral-100 dark:bg-neutral-800 rounded-md p-3 my-2 overflow-x-auto"><code class="text-sm">$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Handle headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 border-b border-neutral-200 dark:border-neutral-700 pb-2">$1</h1>')
    
    // Handle bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    
    // Handle lists (basic support)
    .replace(/^[\s]*[-*+] (.*)$/gm, '<li class="ml-4 list-disc list-inside mb-1">$1</li>')
    .replace(/^[\s]*\d+\. (.*)$/gm, '<li class="ml-4 list-decimal list-inside mb-1">$1</li>')
    
    // Handle blockquotes
    .replace(/^> (.*)$/gm, '<blockquote class="border-l-4 border-neutral-300 pl-4 py-1 italic text-neutral-700 dark:text-neutral-300">$1</blockquote>')
    
    // Handle horizontal rules
    .replace(/^---$/gm, '<hr class="my-4 border-t border-neutral-300 dark:border-neutral-600" />')
    
    // Handle line breaks - convert double newlines to paragraphs, single newlines to <br>
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br />');
  
  // Wrap in paragraph tags if content doesn't start with a block element
  const wrappedContent = formattedContent.startsWith('<h') || 
                         formattedContent.startsWith('<pre') || 
                         formattedContent.startsWith('<blockquote') ||
                         formattedContent.startsWith('<li')
    ? formattedContent 
    : `<p class="mb-3 leading-relaxed">${formattedContent}</p>`;
  
  return (
    <div 
      className="prose prose-sm max-w-none text-inherit"
      dangerouslySetInnerHTML={{ __html: wrappedContent }} 
    />
  );
};

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  };
  isLoading?: boolean;
  chatbotName?: string;
  chatbotLogoURL?: string;
  userReplyBackgroundColor?: string;
  userReplyTextColor?: string;
  chatbotReplyBackgroundColor?: string;
  chatbotReplyTextColor?: string;
}

export function ChatMessage({
  message,
  isLoading = false,
  chatbotName = 'AI Assistant',
  chatbotLogoURL,
  userReplyBackgroundColor = '#000000',
  userReplyTextColor = '#FFFFFF',
  chatbotReplyBackgroundColor = '#FFFFFF',
  chatbotReplyTextColor = '#000000',
}: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);
  const [liked, setLiked] = React.useState(false);
  const [disliked, setDisliked] = React.useState(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text: ', error);
    }
  }

  return (
    <div className={cn('flex flex-col space-y-1 mb-4', isUser ? 'items-end' : 'items-start')}>
      {isAssistant && !isLoading && (
        <div className="flex items-center gap-2 ml-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden">
            {chatbotLogoURL ? (
              <img src={chatbotLogoURL} alt="AI" className="w-full h-full object-cover" />
            ) : (
              <Bot className="w-5 h-5 text-neutral-600" />
            )}
          </div>
          <span className="text-sm font-medium text-neutral-700">{chatbotName}</span>
        </div>
      )}
      <div className="flex flex-row items-start gap-2">
        <div
          className={cn(
            'px-4 py-3 max-w-[85%] sm:max-w-[75%] shadow-sm',
            isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm',
            isLoading && 'flex h-8 w-8 items-center justify-center'
          )}
          style={{
            backgroundColor: isUser ? userReplyBackgroundColor : chatbotReplyBackgroundColor,
            color: isUser ? userReplyTextColor : chatbotReplyTextColor,
          }}
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <div className="prose prose-sm max-w-none">
              <SimpleMarkdown content={message.content} />
            </div>
          )}
        </div>
        {isAssistant && !isLoading && (
          <div className="flex flex-row gap-1 mt-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full hover:bg-neutral-100"
              onClick={() => copyToClipboard(message.content)}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-neutral-500" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full hover:bg-neutral-100"
              onClick={() => setLiked(!liked)}
            >
              <ThumbsUp className={cn('h-4 w-4', liked ? 'fill-current text-blue-500' : 'text-neutral-500')} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full hover:bg-neutral-100"
              onClick={() => setDisliked(!disliked)}
            >
              <ThumbsDown className={cn('h-4 w-4', disliked ? 'fill-current text-blue-500' : 'text-neutral-500')} />
            </Button>
          </div>
        )}
      </div>
      {isUser && (
        <div className="text-xs text-neutral-500 mr-2 mt-1">You</div>
      )}
    </div>
  );
} 