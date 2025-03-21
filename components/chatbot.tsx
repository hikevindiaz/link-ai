"use client"

import React from 'react'
import { Suspense } from 'react'
import { useSearchParams } from "next/navigation";
import { ChatWidget } from '@/components/chat-interface/chat-widget';

interface ChatbotProps {
  chatbotData?: {
    id: string;
    name: string;
    chatbotLogoURL?: string;
    bubbleTextColor?: string;
    bubbleColor?: string;
  };
}

export default function Chatbot({ chatbotData }: ChatbotProps) {
    function ChatboxWrapper() {
        const params = useSearchParams();
        const chatboxParam = params?.get('chatbox') || '';

        // Use the chatbot ID from props or fallback to the default
        const chatbotId = chatbotData?.id || "default-id";
        
        if (chatboxParam.match('false')) {
            return null;
        } else {
            // Make sure we have a valid component
            if (!ChatWidget) {
                console.error("ChatWidget component is undefined");
                return <div>Error loading chat widget</div>;
            }
            
            return (
                <ChatWidget 
                    chatbotId={chatbotId}
                    chatTitle={chatbotData?.name}
                    chatbotLogoURL={chatbotData?.chatbotLogoURL}
                    chatHeaderBackgroundColor="#FFFFFF"
                    chatHeaderTextColor="#000000"
                    chatBackgroundColor="#F9F9F9"
                    chatbotReplyBackgroundColor="#FFFFFF"
                    chatbotReplyTextColor="#000000"
                    userReplyBackgroundColor="#000000"
                    userReplyTextColor="#FFFFFF"
                />
            );
        }
    }

    return (
        <div className="w-full h-full">
            <Suspense fallback={<div>Loading chat...</div>}>
                <ChatboxWrapper />
            </Suspense>
        </div>
    );
}