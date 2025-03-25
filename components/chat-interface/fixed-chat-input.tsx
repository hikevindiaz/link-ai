'use client';

import React, { useCallback } from 'react';
import { MultimodalInput } from './multimodal-input';
import { Attachment, Message } from 'ai';
import { toast } from 'sonner';

// This wrapper component handles the type incompatibilities between different
// versions of the AI libraries and our custom components
interface FixedChatInputProps {
  chatId: string;
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
      
      // Try to submit with attachments if they exist
      if (attachments.length > 0) {
        try {
          // @ts-ignore - Support different API versions
          handleSubmit(e || { preventDefault: () => {}, stopPropagation: () => {} }, { 
            experimental_attachments: attachments 
          });
        } catch (error) {
          // Fallback to simpler version
          handleSubmit(e || { preventDefault: () => {}, stopPropagation: () => {} });
          toast.error("Attachments may not be supported in this version");
        }
      } else {
        // No attachments, use simple version
        handleSubmit(e || { preventDefault: () => {}, stopPropagation: () => {} });
      }
    } catch (error) {
      console.error("Error in submit:", error);
      toast.error("Failed to send message");
    }
  }, [handleSubmit, attachments]);

  // Create a compatible wrapper around append
  const wrappedAppend = useCallback(async (message: Message) => {
    try {
      return await append(message);
    } catch (error) {
      console.error("Error in append:", error);
      return Promise.resolve();
    }
  }, [append]);

  return (
    <MultimodalInput
      chatId={chatId}
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