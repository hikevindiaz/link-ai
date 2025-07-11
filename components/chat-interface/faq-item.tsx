import React from 'react';
import { cn } from '@/lib/utils';

interface FAQItemProps {
  question: string;
  highlighted?: string;
  onClick: () => void;
}

export function FAQItem({ question, highlighted = '', onClick }: FAQItemProps) {
  // Function to highlight the matching text
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <span key={i} className="bg-yellow-200">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <button
      className={cn(
        "w-full text-left px-4 py-2 rounded-lg border border-neutral-200",
        "hover:bg-neutral-50 transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500"
      )}
      onClick={onClick}
    >
      <div className="text-sm font-medium text-neutral-700">
        {highlightText(question, highlighted)}
      </div>
    </button>
  );
} 