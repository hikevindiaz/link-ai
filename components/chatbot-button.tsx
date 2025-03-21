'use client'

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import GradientAgentSphere from './gradientagentsphere';
import ChatOptionsDialog from './chat-options-dialog';
import VoiceChatInterface from './voice-chat-interface';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatbotButtonComponentProps {
    textColor?: string;
    backgroundColor?: string;
    borderGradient?: boolean;
    borderGradientColors?: string[];
    title?: string;
    message?: string;
    waveEmoji?: boolean;
    onToggleChat?: (isOpen: boolean, chatType?: 'text' | 'voice') => void;
    gradientColors?: string[];
    logoUrl?: string;
    chatbotName?: string;
    maxButtonWidth?: number;
    minButtonWidth?: number;
    termsUrl?: string;
    privacyUrl?: string;
    icon?: React.ReactNode;
}

const defaultIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
    </svg>
);

export default function ChatbotButton({ 
    textColor = "#000000", 
    backgroundColor = "#FFFFFF",
    borderGradient = true,
    borderGradientColors = ["#2563EB", "#7E22CE", "#F97316"], // Blue, Purple, Orange for the border
    title,
    message = "Hi, let's talk",
    waveEmoji = true,
    onToggleChat,
    gradientColors = ["#022597", "#000001", "#1a56db"], // Default colors for the sphere
    logoUrl,
    chatbotName,
    maxButtonWidth = 320,
    minButtonWidth = 180,
    termsUrl = "https://getlinkai.com/terms",
    privacyUrl = "https://getlinkai.com/privacy",
    icon = defaultIcon
}: ChatbotButtonComponentProps) {
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);
    const [isVoiceChatVisible, setIsVoiceChatVisible] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const messageRef = useRef<HTMLSpanElement>(null);
    const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined);
    const [displayedMessage, setDisplayedMessage] = useState(message);
    
    // Use chatbot name as title if provided, otherwise use default
    const displayTitle = chatbotName || title || "Link AI Smart Agent";

    // Calculate button width based on text content and update displayed message if needed
    useEffect(() => {
        if (messageRef.current) {
            // Create a temporary span to measure the full text width
            const tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.whiteSpace = 'nowrap';
            tempSpan.style.fontSize = '1rem';
            tempSpan.style.fontWeight = 'bold';
            tempSpan.textContent = message;
            document.body.appendChild(tempSpan);
            
            const fullTextWidth = tempSpan.offsetWidth;
            document.body.removeChild(tempSpan);
            
            const logoWidth = 36; // w-9 = 36px
            const padding = 24; // px-3 = 12px * 2
            const gap = 8; // gap-2 = 8px
            const emojiWidth = waveEmoji ? 20 : 0; // Approximate width of emoji
            const margin = 24; // Extra margin for safety
            
            const requiredWidth = fullTextWidth + logoWidth + padding + gap + emojiWidth + margin;
            
            // If the text fits within maxButtonWidth, show it all
            if (requiredWidth <= maxButtonWidth) {
                setDisplayedMessage(message);
                setButtonWidth(Math.max(requiredWidth, minButtonWidth));
            } else {
                // Otherwise, we need to truncate
                // Find the maximum number of characters that can fit
                let maxChars = message.length;
                let truncatedMessage = message;
                
                while (maxChars > 0) {
                    truncatedMessage = message.substring(0, maxChars) + "...";
                    tempSpan.textContent = truncatedMessage;
                    document.body.appendChild(tempSpan);
                    
                    const truncatedWidth = tempSpan.offsetWidth;
                    document.body.removeChild(tempSpan);
                    
                    const truncatedRequiredWidth = truncatedWidth + logoWidth + padding + gap + emojiWidth + margin;
                    
                    if (truncatedRequiredWidth <= maxButtonWidth) {
                        setDisplayedMessage(truncatedMessage);
                        setButtonWidth(Math.max(truncatedRequiredWidth, minButtonWidth));
                        break;
                    }
                    
                    maxChars--;
                }
            }
        }
    }, [message, waveEmoji, maxButtonWidth, minButtonWidth]);

    useEffect(() => {
        // For compatibility with iframe messaging if still needed
        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'openChat') {
                // Don't automatically set chat visible, wait for user selection
                setIsOptionsVisible(true);
            }

            if (event.data === 'closeChat') {
                closeAllInterfaces();
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    function toggleChatVisibility() {
        console.log("Toggle chat visibility, current states:", { 
            isChatVisible, 
            isOptionsVisible, 
            isVoiceChatVisible, 
            isTransitioning 
        });
        
        if (isTransitioning) {
            console.log("Ignoring click during transition");
            return;
        }
        
        setIsTransitioning(true);
        
        if (isChatVisible || isOptionsVisible || isVoiceChatVisible) {
            // Close everything
            closeAllInterfaces();
        } else {
            // Show options dialog
            showOptionsDialog();
        }
    }
    
    function showOptionsDialog() {
        console.log("Showing options dialog");
        setIsOptionsVisible(true);
        
        // Call the callback if provided, but don't specify chat type yet
        if (onToggleChat) {
            onToggleChat(true);
        }
        
        timeoutRef.current = setTimeout(() => {
            setIsTransitioning(false);
        }, 300);
    }
    
    function closeAllInterfaces() {
        console.log("Closing all interfaces");
        setIsOptionsVisible(false);
        setIsVoiceChatVisible(false);
        
        // Call the callback if provided
        if (onToggleChat) {
            onToggleChat(false);
        }
        
        // For backward compatibility with iframe approach
        window.parent.postMessage('closeChat', '*');
        
        // Delay the state change to allow for animation
        timeoutRef.current = setTimeout(() => {
            setIsChatVisible(false);
            timeoutRef.current = setTimeout(() => {
                setIsTransitioning(false);
            }, 300);
        }, 150);
    }
    
    function handleOptionSelect(option: 'text' | 'voice') {
        console.log("Option selected:", option);
        // Immediately hide the options dialog to prevent it from showing again
        setIsOptionsVisible(false);
        
        if (option === 'text') {
            // Open text chat
            setIsChatVisible(true);
            
            // Call the callback with the chat type
            if (onToggleChat) {
                onToggleChat(true, 'text');
            }
            
            // Now send the message to open the chat iframe
            window.parent.postMessage('openChat', '*');
        } else {
            // Open voice chat
            setIsVoiceChatVisible(true);
            
            // Call the callback with the chat type
            if (onToggleChat) {
                onToggleChat(true, 'voice');
            }
        }
    }
    
    function handleVoiceChatClose() {
        console.log("Voice chat closed");
        setIsVoiceChatVisible(false);
        setIsTransitioning(false);
        
        // Call the callback if provided
        if (onToggleChat) {
            onToggleChat(false);
        }
    }

    // Create gradient colors for conic gradient (border)
    const [color1, color2, color3] = borderGradientColors;

    return (
        <div ref={containerRef} className="relative" style={{ height: (isChatVisible || isOptionsVisible || isVoiceChatVisible) ? '48px' : 'auto' }}>
            {/* Chat Button */}
            <div 
                className={`
                    transition-all duration-300 cursor-pointer overflow-hidden
                    ${(isChatVisible || isOptionsVisible || isVoiceChatVisible) ? 'opacity-0 scale-0 absolute pointer-events-none' : 'opacity-100 scale-100'}
                    ${isTransitioning ? 'transform' : ''}
                    ${borderGradient ? 'animate-border' : ''}
                `}
                style={{ 
                    width: buttonWidth ? `${buttonWidth}px` : 'auto',
                    minWidth: `${minButtonWidth}px`,
                    maxWidth: `${maxButtonWidth}px`,
                    borderRadius: '16px',
                    padding: borderGradient ? '1px' : '0',
                    background: borderGradient ? 
                        `conic-gradient(from var(--border-angle), ${color1}, ${color2}, ${color3}, ${color2}, ${color1})` : 'transparent',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    transformOrigin: 'right bottom',
                    position: (isChatVisible || isOptionsVisible || isVoiceChatVisible) ? 'absolute' : 'relative',
                    right: 0,
                    bottom: 0
                }}
                onClick={!isTransitioning ? toggleChatVisibility : undefined}
            >
                <div 
                    className="flex items-center gap-2 px-3 py-2 rounded-[14px] w-full"
                    style={{ backgroundColor }}
                >
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                        {logoUrl ? (
                            <Image 
                                src={logoUrl} 
                                alt={displayTitle}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <GradientAgentSphere size={36} gradientColors={gradientColors} />
                        )}
                    </div>
                    
                    <div className="flex flex-col -space-y-1 min-w-0 flex-grow">
                        <span className="text-[10px] font-normal opacity-70 truncate" style={{ color: textColor }}>{displayTitle}</span>
                        <div className="flex items-center">
                            <span 
                                ref={messageRef} 
                                className="text-base font-bold whitespace-nowrap" 
                                style={{ color: textColor }}
                            >
                                {displayedMessage}
                            </span>
                            {waveEmoji && (
                                <span className="ml-1 text-base flex-shrink-0" role="img" aria-label="wave">
                                    👋
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* X Button */}
            <div 
                className={`
                    transition-all duration-300 cursor-pointer overflow-hidden
                    ${!(isChatVisible || isOptionsVisible || isVoiceChatVisible) ? 'opacity-0 scale-0 absolute pointer-events-none' : 'opacity-100 scale-100'}
                    ${isTransitioning ? 'transform' : ''}
                    ${borderGradient ? 'animate-border' : ''}
                `}
                style={{ 
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    padding: borderGradient ? '1px' : '0',
                    background: borderGradient ? 
                        `conic-gradient(from var(--border-angle), ${color1}, ${color2}, ${color3}, ${color2}, ${color1})` : 'transparent',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    transformOrigin: 'center',
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    zIndex: 60 // Ensure it's above other elements
                }}
                onClick={!isTransitioning ? toggleChatVisibility : undefined}
            >
                <div 
                    className="flex items-center justify-center w-full h-full rounded-full"
                    style={{ backgroundColor }}
                >
                    <X 
                        size={20} 
                        color={textColor} 
                        className={`transition-transform duration-300 ${isTransitioning && !(isChatVisible || isOptionsVisible || isVoiceChatVisible) ? 'rotate-90' : 'rotate-0'}`}
                    />
                </div>
            </div>
            
            {/* Options Dialog */}
            {isOptionsVisible && (
                <ChatOptionsDialog 
                    onClose={closeAllInterfaces}
                    onSelectOption={handleOptionSelect}
                    textColor={textColor === "#000000" ? "#FFFFFF" : textColor}
                    backgroundColor={backgroundColor === "#FFFFFF" ? "#000000" : backgroundColor}
                    borderGradientColors={borderGradientColors}
                    gradientColors={gradientColors}
                    termsUrl={termsUrl}
                    privacyUrl={privacyUrl}
                />
            )}
            
            {/* Voice Chat Interface */}
            {isVoiceChatVisible && (
                <VoiceChatInterface 
                    onClose={handleVoiceChatClose}
                    textColor={textColor === "#000000" ? "#FFFFFF" : textColor}
                    backgroundColor={backgroundColor === "#FFFFFF" ? "#000000" : backgroundColor}
                    borderGradientColors={borderGradientColors}
                    gradientColors={gradientColors}
                    chatbotName={displayTitle}
                />
            )}

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
                
                @keyframes slideUpFade {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-slideUpFade {
                    animation: slideUpFade 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}