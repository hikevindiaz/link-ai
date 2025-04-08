'use client';

import React, { useCallback } from 'react';
import { MultimodalInput } from './multimodal-input';
import { Message } from 'ai';
import { toast } from 'sonner';

// Define the Attachment type locally
interface Attachment {
  name?: string; // Make properties optional or align with MultimodalInput's expectation
  type?: string;
  url: string;
  contentType?: string; // Add contentType if used by MultimodalInput
}

// This wrapper component handles the type incompatibilities between different
// versions of the AI libraries and our custom components
interface FixedChatInputProps {
  chatId: string;
  chatbotId: string;
  input: string;
  setInput: (input: string) => void;
  handleSubmit: any; // Use any for flexibility with different API versions
  status: 'error' | 'submitted' | 'streaming' | 'ready';
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  setMessages: React.Dispatch<React.SetStateAction<Array<Message>>>;
  append: (message: Message) => Promise<void>;
  className?: string;
}

export function FixedChatInput(props: FixedChatInputProps) {
  const {
    chatId,
    chatbotId,
    input,
    setInput,
    handleSubmit,
    status,
    stop,
    attachments,
    setAttachments,
    messages,
    setMessages,
    append,
    className
  } = props;

  // Create a compatible wrapper around handleSubmit
  const wrappedHandleSubmit = useCallback((e?: React.FormEvent<HTMLFormElement>) => {
    try {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Don't submit if input is empty
      if (!input.trim() && attachments.length === 0) { // Also check attachments
        return;
      }
      
      // Try to submit with attachments if they exist
      // Use the correct structure expected by useChat (Vercel AI SDK v3)
      const options = attachments.length > 0 ? { data: { attachments: JSON.stringify(attachments) } } : undefined;

      // Pass the event and options to handleSubmit
      handleSubmit(e || { preventDefault: () => {}, stopPropagation: () => {} }, options);

      // Clear attachments after submit if needed (might be handled by useChat hook)
      // setAttachments([]);

    } catch (error) {
      console.error("Error in submit:", error);
      toast.error("Failed to send message");
    }
  }, [handleSubmit, attachments, input]);

  // Create a compatible wrapper around append
  const wrappedAppend = useCallback(async (message: Message) => {
    try {
      // Assuming append expects just the message
      await append(message); 
    } catch (error) {
      console.error("Error in append:", error);
      // Decide if we should return something or rethrow
      // For now, just log and resolve to avoid breaking promise chains
       return Promise.resolve();
    }
  }, [append]);

  return (
    <MultimodalInput
      chatId={chatId}
      chatbotId={chatbotId}
      input={input}
      setInput={setInput}
      handleSubmit={wrappedHandleSubmit}
      status={status}
      stop={stop}
      attachments={attachments}
      setAttachments={setAttachments}
      messages={messages}
      setMessages={setMessages}
      append={wrappedAppend}
      className={className}
    />
  );
} 