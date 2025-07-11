'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ShimmerText: React.FC<ShimmerTextProps> = ({ children, className }) => {
  return (
    <div className={cn("relative inline-block", className)}>
      <span className="bg-gradient-to-r from-neutral-500 via-neutral-900 to-neutral-500 dark:from-neutral-400 dark:via-neutral-100 dark:to-neutral-400 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
        {children}
      </span>
    </div>
  );
};

// Add the shimmer keyframes to your global CSS or create a style tag
export const ShimmerStyles = () => (
  <style jsx global>{`
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .animate-shimmer {
      animation: shimmer 2s ease-in-out infinite;
    }
  `}</style>
); 