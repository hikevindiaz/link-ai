import React, { useState, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/chat-interface/ui/button';

interface ChatInputProps {
  placeholder?: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  allowAttachments?: boolean;
}

export function ChatInput({
  placeholder = 'Type a message...',
  onSend,
  disabled = false,
  allowAttachments = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="relative flex-1">
        <textarea
          className={cn(
            "w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-10",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
            "min-h-[40px] max-h-[200px]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          style={{
            height: 'auto',
            minHeight: '40px',
            maxHeight: '200px',
          }}
        />
        {allowAttachments && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute bottom-1 right-10 h-8 w-8 text-gray-500 hover:text-gray-700"
            disabled={disabled}
          >
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
        )}
      </div>
      <Button
        type="button"
        size="icon"
        className={cn(
          "h-10 w-10 rounded-full bg-indigo-500 text-white hover:bg-indigo-600",
          (!message.trim() || disabled) && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleSend}
        disabled={!message.trim() || disabled}
      >
        <Send className="h-5 w-5" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
} 