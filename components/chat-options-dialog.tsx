'use client'

import React from 'react';
import { X, MessageCircle, Mic } from 'lucide-react';
import GradientAgentSphere from './gradientagentsphere';
import { cn } from '@/lib/utils';

interface ChatOptionsDialogProps {
  onClose: () => void;
  onSelectOption: (option: 'text' | 'voice') => void;
  textColor?: string;
  backgroundColor?: string;
  borderGradientColors?: string[];
  gradientColors?: string[];
  termsUrl?: string;
  privacyUrl?: string;
}

export default function ChatOptionsDialog({
  onClose,
  onSelectOption,
  textColor = "#FFFFFF",
  backgroundColor = "#000000",
  borderGradientColors = ["#2563EB", "#7E22CE", "#F97316"],
  gradientColors = ["#022597", "#000001", "#1a56db"],
  termsUrl = "https://getlinkai.com/legal",
  privacyUrl = "https://getlinkai.com/legal"
}: ChatOptionsDialogProps) {
  // Create gradient colors for conic gradient (border)
  const [color1, color2, color3] = borderGradientColors;
  const conicGradient = `conic-gradient(from var(--border-angle), ${color1}, ${color2}, ${color3}, ${color2}, ${color1})`;

  // Handle option selection with proper event handling
  const handleOptionSelect = (option: 'text' | 'voice') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectOption(option);
  };

  return (
    <div className="fixed bottom-16 right-4 z-50 w-72 animate-slideUpFade">
      <div 
        className={cn(
          "relative animate-border rounded-xl p-[1px] shadow-xl",
          "dark:shadow-lg dark:shadow-blue-900/20"
        )}
        style={{ 
          background: conicGradient
        }}
      >
        <div 
          className="relative rounded-[10px] p-4 flex flex-col gap-4"
          style={{ backgroundColor }}
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X size={16} color={textColor} />
          </button>
          
          {/* Voice Call Button - Simplified white button */}
          <button
            onClick={handleOptionSelect('voice')}
            className={cn(
              "bg-white text-black rounded-lg py-3 px-4 flex items-center gap-3 hover:bg-gray-100 transition-colors",
              "dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200"
            )}
          >
            <Mic size={20} className="text-black" />
            <span className="font-medium">Voice Chat</span>
          </button>
          
          {/* Text Chat Button - Simplified white button */}
          <button
            onClick={handleOptionSelect('text')}
            className={cn(
              "bg-white text-black rounded-lg py-3 px-4 flex items-center gap-3 hover:bg-gray-100 transition-colors",
              "dark:bg-gray-100 dark:text-black dark:hover:bg-gray-200"
            )}
          >
            <MessageCircle size={20} className="text-black" />
            <span className="font-medium">Text Chat</span>
          </button>
          
          {/* Terms and Privacy */}
          <div className="mt-2 text-xs text-center opacity-70" style={{ color: textColor }}>
            By continuing, you agree to our{' '}
            <a 
              href={termsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:opacity-100"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a 
              href={privacyUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:opacity-100"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
      
      {/* CSS for border animation */}
      <style jsx global>{`
        @property --border-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        
        @keyframes border {
          to {
            --border-angle: 360deg;
          }
        }
        
        .animate-border {
          animation: border 4s linear infinite;
        }
      `}</style>
    </div>
  );
} 