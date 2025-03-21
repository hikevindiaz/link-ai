'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ChatContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A wrapper component that provides styling for the chat interface.
 * This is a placeholder that was auto-generated to satisfy imports.
 */
export function ChatContainer({ children, className }: ChatContainerProps) {
  return (
    <div 
      className={cn('chat-interface-container', className)}
      style={{ fontFamily: 'var(--font-sans, sans-serif)' }}
    >
      {children}
    </div>
  );
} 