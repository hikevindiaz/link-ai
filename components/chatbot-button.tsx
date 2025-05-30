'use client'

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import GradientAgentSphere from './gradientagentsphere';
import { motion, AnimatePresence } from 'framer-motion';
import RiveVoiceOrb from './chat-interface/rive-voice-orb';

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
    useRiveOrb?: boolean;
    riveOrbColor?: number;
    displayBranding?: boolean;
    fileAttachmentEnabled?: boolean;
    chatBackgroundColor?: string;
    buttonTheme?: 'light' | 'dark';
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
    waveEmoji = false,
    onToggleChat,
    gradientColors = ["#022597", "#000001", "#1a56db"],
    logoUrl,
    chatbotName,
    maxButtonWidth = 320,
    minButtonWidth = 180,
    icon = defaultIcon,
    useRiveOrb = false,
    riveOrbColor = 0, // Default to BLACK (0)
    displayBranding = false,
    fileAttachmentEnabled = false,
    chatBackgroundColor = "#FFFFFF",
    buttonTheme = 'light'
}: ChatbotButtonComponentProps) {
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const messageRef = useRef<HTMLSpanElement>(null);
    const [buttonWidth, setButtonWidth] = useState<number | undefined>(undefined);
    const [displayedMessage, setDisplayedMessage] = useState(message);
    const [themeId, setThemeId] = useState(Date.now()); // Add a state to track theme changes
    
    // IMPORTANT: Handle both new buttonTheme and legacy chatBackgroundColor
    // First try to use buttonTheme if provided explicitly
    // Then fall back to deriving from chatBackgroundColor (legacy approach)
    // Only then use the provided backgroundColor/textColor
    let derivedBackgroundColor: string;
    let derivedTextColor: string;
    
    if (buttonTheme === 'dark') {
      // New approach with explicit dark theme
      derivedBackgroundColor = "#000000";
      derivedTextColor = "#FFFFFF";
    } else if (buttonTheme === 'light') {
      // New approach with explicit light theme
      derivedBackgroundColor = "#FFFFFF"; 
      derivedTextColor = "#000000";
    } else if (chatBackgroundColor === "#000000") {
      // Legacy approach: dark theme derived from background color
      derivedBackgroundColor = "#000000";
      derivedTextColor = "#FFFFFF";
    } else {
      // Fallback to provided values or defaults
      derivedBackgroundColor = backgroundColor;
      derivedTextColor = textColor;
    }
    
    // Detailed debug log for theme values - important for tracking theme issues
    console.log("[ChatbotButton] Current theme settings:", {
      buttonTheme,
      chatBackgroundColor,
      derivedBackgroundColor,
      derivedTextColor,
      originalBackgroundColor: backgroundColor,
      originalTextColor: textColor,
      resolvedMethod: buttonTheme ? 'explicit-theme' : chatBackgroundColor === "#000000" ? 'legacy-color' : 'fallback',
      componentId: Math.random().toString(36).substring(2,9), // Random ID to help track instances
      timestamp: new Date().toISOString()
    });
    
    const displayTitle = chatbotName || title || "Link AI Smart Agent";

    // Track and force updates on button theme changes
    useEffect(() => {
        console.log("[ChatbotButton] buttonTheme changed:", {
            newTheme: buttonTheme,
            derivedBackgroundColor: buttonTheme === 'dark' ? "#000000" : "#FFFFFF",
            derivedTextColor: buttonTheme === 'dark' ? "#FFFFFF" : "#000000",
            renderId: Math.random().toString(36).substring(2,9) // Add random ID to help track re-renders
        });
        
        // Force a component update when theme changes by updating themeId
        setThemeId(Date.now());
    }, [buttonTheme]);

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
            const logoWidth = 28; const padding = 24; const gap = 8; const emojiWidth = waveEmoji ? 20 : 0; const margin = 8;
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
    
    // Check if all colors are the same (for the "None" option)
    const isMonochrome = color1 === color2 && color2 === color3;
    const showGradient = borderGradient && !isMonochrome;

    const chatButtonVisibilityClass = isChatVisible ? 'opacity-0 scale-0 absolute pointer-events-none' : 'opacity-100 scale-100';
    const closeButtonVisibilityClass = !isChatVisible ? 'opacity-0 scale-0 absolute pointer-events-none' : 'opacity-100 scale-100';

    return (
        <div ref={containerRef} className="relative" style={{ height: 'auto' }}>
            <div 
                className={`
                    transition-all duration-300 cursor-pointer
                    ${chatButtonVisibilityClass}
                    ${isTransitioning ? 'transform' : ''}
                    ${showGradient ? 'animate-border' : ''}
                `}
                style={{ 
                    width: buttonWidth ? `${buttonWidth}px` : 'auto',
                    minWidth: `${minButtonWidth}px`,
                    maxWidth: `${maxButtonWidth}px`,
                    borderRadius: '10px',
                    padding: showGradient ? '1px' : '0',
                    background: showGradient ? 
                        `conic-gradient(from var(--border-angle), ${color1}, ${color2}, ${color3}, ${color2}, ${color1})` : 'transparent',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    transformOrigin: 'right bottom',
                    position: 'relative',
                    right: 0,
                    bottom: 0,
                    border: isMonochrome ? '1px solid #e5e7eb' : 'none'
                }}
                onClick={!isTransitioning ? toggleChatVisibility : undefined}
            >
                <div 
                    className="flex items-center gap-2 pl-3 pr-3 py-2 rounded-[8px] w-full"
                    style={{ 
                        backgroundColor: derivedBackgroundColor,
                        boxShadow: showGradient ? 'inset 0 0 10px rgba(255, 255, 255, 0.3)' : 'none'
                    }}
                >
                    <div className="w-7 h-7 rounded-full flex-shrink-0 relative flex items-center justify-center">
                        {useRiveOrb ? (
                            <div className="absolute top-1/2 left-1/2 w-7 h-7" style={{ transform: 'translate(-50%, -50%) scale(1.25)' }}>
                                <RiveVoiceOrb 
                                    isListening={false}
                                    isThinking={true}
                                    isSpeaking={false}
                                    isWaiting={false}
                                    isAsleep={false}
                                    isUserSpeaking={false}
                                    audioLevel={0.7}
                                    isPreview={true}
                                    previewColorValue={riveOrbColor}
                                    key={`chatbot-orb-${riveOrbColor}`}
                                />
                            </div>
                        ) : logoUrl ? (
                            <Image 
                                src={logoUrl}
                                alt={displayTitle}
                                fill
                                className="object-cover rounded-full"
                            />
                        ) : (
                            <GradientAgentSphere size={28} gradientColors={gradientColors} />
                        )}
                    </div>
                    
                    <div className="flex flex-col -space-y-1 min-w-0 flex-grow">
                        <span className="text-[10px] font-normal opacity-70 truncate" style={{ color: derivedTextColor }}>{displayTitle}</span>
                        <div className="flex items-center">
                            <span 
                                ref={messageRef} 
                                className="text-base font-bold whitespace-nowrap" 
                                style={{ color: derivedTextColor }}
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
                        ${showGradient ? 'animate-border' : ''}
                    `}
                    style={{ 
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        padding: showGradient ? '1px' : '0',
                        background: showGradient ? 
                            `conic-gradient(from var(--border-angle), ${color1}, ${color2}, ${color3}, ${color2}, ${color1})` : 'transparent',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        transformOrigin: 'center',
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        zIndex: 60,
                        border: isMonochrome ? '1px solid #e5e7eb' : 'none'
                    }}
                    onClick={!isTransitioning ? toggleChatVisibility : undefined}
                >
                    <div 
                        className="flex items-center justify-center w-full h-full rounded-full"
                        style={{ 
                            backgroundColor: derivedBackgroundColor,
                            boxShadow: showGradient ? 'inset 0 0 10px rgba(255, 255, 255, 0.3)' : 'none'
                        }}
                    >
                        <X 
                            size={18} 
                            color={derivedTextColor} 
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
                .animate-border { 
                    animation: border 4s linear infinite; 
                    position: relative;
                }
                .animate-border::after {
                    content: '';
                    position: absolute;
                    inset: -1px;
                    border-radius: inherit;
                    padding: 2px;
                    background: inherit;
                    filter: blur(4px);
                    opacity: 0.3;
                    pointer-events: none;
                    z-index: -1;
                }
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideUpFade { animation: slideUpFade 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}