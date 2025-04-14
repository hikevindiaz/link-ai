'use client';

import { useState, useCallback } from 'react';
import { StreamingVoiceUI } from '@/components/chat-interface/streaming-voice-ui';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VoiceExperiencePage() {
  const [chatbotId, setChatbotId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  
  // Handle when a transcript is finalized
  const handleTranscriptFinalized = useCallback((transcript: string) => {
    // Add user message to history
    setMessages(prev => [...prev, { role: 'user', content: transcript }]);
    
    // Simulate AI response for demo
    setTimeout(() => {
      const responses: Record<string, string> = {
        "What's the weather like today?": "I don't have real-time weather data, but I can help you check a weather service for the latest forecast.",
        "Tell me about the latest news.": "I don't have access to current news, but I can recommend some reliable news sources you might want to check.",
        "How can you help me with my project?": "I can assist with planning, research, brainstorming ideas, and providing feedback on your project. What specifically are you working on?",
        "What time is it in Tokyo right now?": "I don't have access to real-time information, but Tokyo is typically 13-14 hours ahead of Eastern Time, depending on daylight saving time.",
        "Can you explain how voice interfaces work?": "Voice interfaces use speech recognition to convert audio to text, natural language processing to understand meaning, and text-to-speech to respond verbally."
      };
      
      let response = "I understand you said: " + transcript;
      
      // Check if there's a prepared response
      for (const key in responses) {
        if (transcript.toLowerCase().includes(key.toLowerCase().replace(/[?.,]/g, ''))) {
          response = responses[key];
          break;
        }
      }
      
      // Add AI response to history
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 1000);
  }, []);
  
  return (
    <div className="min-h-dvh flex flex-col bg-white dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 py-4 px-6 flex items-center">
        <Link href="/chat" className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Streaming Voice Experience
        </h1>
      </header>
      
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Voice Interface */}
        <div className="w-full md:w-1/2">
          <StreamingVoiceUI
            chatbotId="demo-chatbot"
            welcomeMessage="Hello! This is a demo of our streaming voice interface. How can I help you today?"
            onTranscriptFinalized={handleTranscriptFinalized}
            className="h-full"
          />
        </div>
        
        {/* Message History */}
        <div className="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 p-6 overflow-y-auto">
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
            Conversation History
          </h2>
          
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Your conversation will appear here. Start by clicking "Voice Call" and speaking.
              </p>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 ml-6' 
                      : 'bg-gray-100 dark:bg-gray-800 mr-6'
                  }`}
                >
                  <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {message.role === 'user' ? 'You' : 'AI'}
                  </p>
                  <p className="text-gray-800 dark:text-gray-200">
                    {message.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <footer className="border-t border-gray-200 dark:border-gray-800 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Streaming voice interface uses real-time audio processing with minimal latency.
        </p>
      </footer>
    </div>
  );
} 