'use client'

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import GradientAgentSphere from './gradientagentsphere';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatbotButtonComponentProps {
    textColor?: string;
    backgroundColor?: string;
    borderGradient?: boolean;
    borderGradientColors?: string[];
    title?: string;
    message?: string;
    waveEmoji?: boolean;
    onToggleChat?: (isOpen: boolean) => void;
    gradientColors?: string[];
    logoUrl?: string;
    chatbotName?: string;
    maxButtonWidth?: number;
    minButtonWidth?: number;
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
    borderGradientColors = ["#2563EB", "#7E22CE", "#F97316"],
    title,
    message = "Hi, let's talk",
    waveEmoji = true,
    onToggleChat,
    gradientColors = ["#022597", "#000001", "#1a56db"],
    logoUrl,
    chatbotName,
    maxButtonWidth = 320,
    minButtonWidth = 180,
    icon = defaultIcon
}: ChatbotButtonComponentProps) {
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const messageRef = useRef<HTMLSpanElement>(null);
    const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined);
    const [displayedMessage, setDisplayedMessage] = useState(message);
    
    const displayTitle = chatbotName || title || "Link AI Smart Agent";

    useEffect(() => {
        if (messageRef.current) {
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
            const logoWidth = 36; const padding = 24; const gap = 8; const emojiWidth = waveEmoji ? 20 : 0; const margin = 24;
            const requiredWidth = fullTextWidth + logoWidth + padding + gap + emojiWidth + margin;
            if (requiredWidth <= maxButtonWidth) {
                setDisplayedMessage(message);
                setButtonWidth(Math.max(requiredWidth, minButtonWidth));
            } else {
                let maxChars = message.length; let truncatedMessage = message;
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
        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'openChat') {
                if (!isChatVisible) {
                    console.log("Button received 'openChat' message");
                    setIsChatVisible(true);
                    setIsTransitioning(false);
                }
            }

            if (event.data === 'closeChat') {
                if (isChatVisible) {
                    console.log("Button received 'closeChat' message");
                    setIsChatVisible(false);
                    setIsTransitioning(false);
                }
            }
        };

        window.addEventListener('message', handleMessage);

        const handleParentReady = () => {
            console.log("Parent frame ready, posting initial state");
            window.parent.postMessage(isChatVisible ? 'chatOpen' : 'chatClosed', '*');
        };
        window.addEventListener('parentReady', handleParentReady);

        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('parentReady', handleParentReady);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isChatVisible]);

    function toggleChatVisibility() {
        console.log("Button toggling chat visibility, current state:", isChatVisible);
        
        if (isTransitioning) {
            console.log("Ignoring click during transition");
            return;
        }
        
        setIsTransitioning(true);
        const nextVisibility = !isChatVisible;
        
        window.parent.postMessage(nextVisibility ? 'openChat' : 'closeChat', '*');

        timeoutRef.current = setTimeout(() => {
            setIsTransitioning(false);
            console.log("Button transition finished, posted message:", nextVisibility ? 'openChat' : 'closeChat');
        }, 300); 
    }

    const [color1, color2, color3] = borderGradientColors;

    const chatButtonVisibilityClass = isChatVisible ? 'opacity-0 scale-0 absolute pointer-events-none' : 'opacity-100 scale-100';
    const closeButtonVisibilityClass = !isChatVisible ? 'opacity-0 scale-0 absolute pointer-events-none' : 'opacity-100 scale-100';

    return (
        <div ref={containerRef} className="relative" style={{ height: 'auto' }}>
            <div 
                className={`
                    transition-all duration-300 cursor-pointer overflow-hidden
                    ${chatButtonVisibilityClass}
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
                    position: 'relative',
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

            {isChatVisible && (
                 <div 
                    className={`
                        transition-all duration-300 cursor-pointer overflow-hidden
                        ${closeButtonVisibilityClass} 
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
                        zIndex: 60 
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
                            className={`transition-transform duration-300 ${isTransitioning && !isChatVisible ? 'rotate-90' : 'rotate-0'}`}
                        />
                    </div>
                </div>
            )}
            
            <style jsx global>{`
                @property --border-angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                }
                @keyframes border { to { --border-angle: 360deg; } }
                .animate-border { animation: border 4s linear infinite; }
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideUpFade { animation: slideUpFade 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}