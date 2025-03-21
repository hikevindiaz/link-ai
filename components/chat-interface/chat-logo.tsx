'use client';

import React from 'react';
import Image from 'next/image';
import LinkAIProfileIcon from '@/components/LinkAIProfileIcon';

interface ChatLogoProps {
  chatbotLogoURL?: string | null;
  size?: number;
  className?: string;
}

export function ChatLogo({ chatbotLogoURL, size = 64, className = '' }: ChatLogoProps) {
  if (chatbotLogoURL) {
    return (
      <div className={`relative ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
        <Image
          src={chatbotLogoURL}
          alt="Chatbot Logo"
          width={size}
          height={size}
          className="object-contain w-full h-full rounded-full"
          onError={() => {
            // If image fails to load, we'll use the fallback
            console.log("Logo failed to load, using fallback");
          }}
        />
      </div>
    );
  }
  
  // Fallback to LinkAIProfileIcon with a wrapper to make it bigger
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <LinkAIProfileIcon />
    </div>
  );
} 