import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import React, { useState, useEffect, useCallback } from 'react';
import { ChatLogo } from '@/components/chat-interface/chat-logo';
import TypewriterSubtitle from './typewriter-subtitle';

// Define question categories
const generalQuestions = [
  "What services do you offer?",
  "What are your business hours?",
  "Where are you located?",
  "How can I contact support?",
];

const productQuestions = [
  "Can you show me your products?",
  "What are the prices?",
  "Do you have [specific product]?",
  "Compare product A and product B.",
];

const orderQuestions = [
  "How can I place an order?",
  "What's the status of my order?",
  "Can I track my shipment?",
];

const leadGenQuestions = [
  "Can I get a quote?",
  "Request a demo.",
  "How do I sign up?",
];

const appointmentQuestions = [
  "How do I book an appointment?",
  "Check availability for next Tuesday.",
  "Cancel my appointment.",
];

const qaQuestions = [
  "Tell me about [topic from Q&A]?",
  "What is your policy on returns?", // Example generic policy question
];

const textFileQuestions = [
  "Summarize your key features.",
  "What makes your company unique?", // Example generic text question
];

interface OverviewProps {
  chatbotId: string;
  chatbotLogoURL?: string | null;
  welcomeMessage?: string | null;
}

export const Overview = ({ chatbotId, chatbotLogoURL, welcomeMessage }: OverviewProps) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<string[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    setMounted(true);

    async function fetchChatbotConfigAndSetQuestions() {
      if (!chatbotId) return;
      setIsLoadingConfig(true);
      try {
        // Fetch full chatbot config, including knowledge sources
        const response = await fetch(`/api/chatbots/${chatbotId}`); // Use the existing API route
        if (!response.ok) {
          throw new Error('Failed to fetch chatbot config');
        }
        const config = await response.json();
        
        console.log("[Overview] Fetched chatbot config:", config); // Debug log

        let relevantQuestions: string[] = [...generalQuestions];

        // Check knowledge sources
        if (config.knowledgeSources && config.knowledgeSources.length > 0) {
          const hasCatalog = config.knowledgeSources.some((ks: any) => ks.catalogContents && ks.catalogContents.length > 0);
          const hasQA = config.knowledgeSources.some((ks: any) => ks.qaContents && ks.qaContents.length > 0);
          const hasText = config.knowledgeSources.some((ks: any) => ks.textContents && ks.textContents.length > 0);
          // You might need more specific checks based on your actual schema/data

          if (hasCatalog) {
            relevantQuestions = [...relevantQuestions, ...productQuestions, ...orderQuestions];
          }
          if (hasQA) {
            relevantQuestions = [...relevantQuestions, ...qaQuestions];
          }
          if (hasText) {
            relevantQuestions = [...relevantQuestions, ...textFileQuestions];
          }
        }

        // Check for form integrations (assuming forms imply appointments/leads)
        // This requires knowing how forms are linked/identified in your config
        // Example placeholder check:
        // if (config.forms && config.forms.length > 0) {
        //    relevantQuestions = [...relevantQuestions, ...leadGenQuestions, ...appointmentQuestions];
        // }
        
        // --- Add more checks based on your specific chatbot capabilities --- 

        // Remove duplicates and set active questions
        setActiveQuestions(Array.from(new Set(relevantQuestions)));

      } catch (error) {
        console.error('[Overview] Error fetching chatbot config:', error);
        setActiveQuestions(generalQuestions); // Fallback to general questions on error
      } finally {
        setIsLoadingConfig(false);
      }
    }

    fetchChatbotConfigAndSetQuestions();

  }, [chatbotId]); // Depend on chatbotId

  if (!mounted) return null;
  
  const displayMessage = welcomeMessage || "Hello! How can I assist you today?";
  
  return (
    <motion.div
      key="overview"
      className="px-4 md:px-4 md:mt-20 flex-1 flex"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex flex-col items-center justify-center h-full gap-6 leading-relaxed max-w-3xl mx-auto">
        <p className="text-4xl mt-2 text-center"> 
          <span> 
            {displayMessage}
          </span>
        </p>
        {/* Render TypewriterSubtitle only when not loading and questions exist */}
        {!isLoadingConfig && activeQuestions.length > 0 && (
          <TypewriterSubtitle questions={activeQuestions} />
        )}
      </div>
    </motion.div>
  );
};
