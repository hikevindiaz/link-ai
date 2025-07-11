'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RiveGlint from '@/components/chat-interface/rive-glint';
import { ShimmerText, ShimmerStyles } from '@/components/chat-interface/shimmer-text';

interface ProgressiveStep {
  message: string;
  duration: number; // in milliseconds
}

interface ProgressiveThinkingProps {
  userQuery?: string;
  toolName?: string;
  isStreaming?: boolean;
  className?: string;
  agentId?: string;
}

// Check if a user message is actually a request vs just a conversational response
const isActualRequest = (query: string): boolean => {
  const trimmed = query.toLowerCase().trim();
  
  // Short responses that are clearly not requests
  const conversationalResponses = [
    'ok', 'okay', 'yes', 'yeah', 'yep', 'sure', 'no', 'nope', 'thanks', 'thank you', 
    'good', 'great', 'perfect', 'nice', 'cool', 'awesome', 'got it', 'understood',
    'right', 'correct', 'exactly', 'true', 'false', 'maybe', 'perhaps', 'hi', 
    'hello', 'hey', 'bye', 'goodbye', 'see you', 'later', 'lol', 'haha', 'hmm',
    'interesting', 'wow', 'amazing', 'wonderful', 'excellent', 'fine', 'alright'
  ];
  
  // Check if it's just a short conversational response
  if (conversationalResponses.includes(trimmed)) {
    return false;
  }
  
  // Check if it's just punctuation or very short (likely not a real request)
  if (trimmed.length < 3 || /^[!@#$%^&*(),.?":{}|<>]*$/.test(trimmed)) {
    return false;
  }
  
  return true;
};

// Generate progressive thinking steps based on query analysis and tool being used
const generateProgressiveSteps = (userQuery?: string, toolName?: string): ProgressiveStep[] => {
  if (!userQuery || !isActualRequest(userQuery)) {
    return [{ message: "Thinking...", duration: 0 }];
  }

  const query = userQuery.toLowerCase().trim();
  
  // Tool-specific progressive messages - these take priority
  if (toolName) {
    switch (toolName) {
      case 'getWeather':
      case 'weather':
        return [
          { message: "Checking weather services...", duration: 1800 },
          { message: "Getting current conditions...", duration: 2000 },
          { message: "Analyzing forecast data...", duration: 0 }
        ];
        
      case 'aviationstack':
      case 'aviation':
        return [
          { message: "Accessing flight databases...", duration: 2000 },
          { message: "Checking real-time status...", duration: 2200 },
          { message: "Gathering flight details...", duration: 0 }
        ];
        
      case 'google_search':
      case 'googleSearch':
      case 'web_search':
        return [
          { message: "Searching the web...", duration: 2000 },
          { message: "Analyzing results...", duration: 2200 },
          { message: "Finding relevant information...", duration: 0 }
        ];
        
      case 'check_availability':
        return [
          { message: "Checking calendar availability...", duration: 1500 },
          { message: "Looking for open time slots...", duration: 1800 },
          { message: "Finding the best times for you...", duration: 0 }
        ];
        
      case 'book_appointment':
        return [
          { message: "Scheduling your appointment...", duration: 1500 },
          { message: "Reserving your time slot...", duration: 1800 },
          { message: "Confirming your booking...", duration: 0 }
        ];
        
      case 'view_appointment':
        return [
          { message: "Looking up your appointment...", duration: 1500 },
          { message: "Retrieving booking details...", duration: 0 }
        ];
        
      case 'modify_appointment':
        return [
          { message: "Checking new availability...", duration: 1500 },
          { message: "Updating your appointment...", duration: 1800 },
          { message: "Confirming changes...", duration: 0 }
        ];
        
      case 'cancel_appointment':
        return [
          { message: "Processing cancellation...", duration: 1500 },
          { message: "Removing your appointment...", duration: 0 }
        ];
      
      default:
        // For unknown tools, just show simple thinking
        return [{ message: "Processing...", duration: 0 }];
    }
  }
  
  // Query-based progressive messages when no specific tool is identified
  // Check these in order of specificity
  
  // Weather queries - check first to avoid false matches
  if (query.includes('weather') || query.includes('temperature') || query.includes('forecast') || 
      query.includes('rain') || query.includes('snow') || query.includes('sunny') || 
      query.includes('cloudy') || query.includes('wind') || query.includes('humid')) {
    return [
      { message: "Let me check the weather for you...", duration: 1800 },
      { message: "Getting current conditions...", duration: 2000 },
      { message: "Preparing forecast details...", duration: 0 }
    ];
  }
  
  // Flight/Aviation queries - check early to avoid false matches
  if (query.includes('flight') || query.includes('fly') || query.includes('airline') || 
      query.includes('airport') || query.includes('departure') || query.includes('arrival') ||
      query.includes('plane') || query.match(/\b[A-Z]{3}\s+(to|->|→)\s+[A-Z]{3}\b/i) ||
      query.match(/\bfrom\s+[A-Z]{3}\s+to\s+[A-Z]{3}\b/i)) {
    return [
      { message: "Let me search for flights...", duration: 2000 },
      { message: "Checking airline schedules...", duration: 2200 },
      { message: "Finding the best options...", duration: 0 }
    ];
  }
  
  // Itinerary Planning
  if (query.includes('itinerary') || query.includes('trip') || query.includes('travel plan') || 
      (query.includes('plan') && (query.includes('trip') || query.includes('vacation') || query.includes('visit')))) {
    return [
      { message: "Analyzing travel requirements...", duration: 2500 },
      { message: "Researching destinations...", duration: 2800 },
      { message: "Planning your itinerary...", duration: 0 }
    ];
  }
  
  // Restaurant/Food Search
  if (query.includes('restaurant') || query.includes('food') || query.includes('eat') || 
      query.includes('dining') || query.includes('cuisine') || query.includes('menu')) {
    if (query.includes('best') || query.includes('recommend')) {
      return [
        { message: "Let me find great restaurants for you...", duration: 2200 },
        { message: "Checking reviews and ratings...", duration: 2400 },
        { message: "Preparing recommendations...", duration: 0 }
      ];
    }
    return [
      { message: "Searching for restaurants...", duration: 2000 },
      { message: "Gathering dining options...", duration: 0 }
    ];
  }
  
  // Booking/Scheduling
  if (query.includes('book') || query.includes('schedule') || query.includes('appointment') || 
      query.includes('reserve') || query.includes('meeting')) {
    return [
      { message: "Let me check availability...", duration: 2000 },
      { message: "Processing your request...", duration: 2300 },
      { message: "Finalizing the details...", duration: 0 }
    ];
  }
  
  // Comparison Requests
  if (query.includes('compare') || query.includes('vs') || query.includes('versus') || 
      query.includes('difference') || query.includes('better')) {
    return [
      { message: "Let me gather the information...", duration: 2400 },
      { message: "Analyzing the differences...", duration: 2600 },
      { message: "Preparing your comparison...", duration: 0 }
    ];
  }
  
  // Research/Analysis
  if (query.includes('research') || query.includes('analyze') || query.includes('study') || 
      query.includes('investigate') || query.includes('explain') || query.includes('how') ||
      query.includes('why') || query.includes('what is')) {
    return [
      { message: "Let me research that for you...", duration: 2300 },
      { message: "Analyzing the information...", duration: 2500 },
      { message: "Organizing my findings...", duration: 0 }
    ];
  }
  
  // Shopping/Product Search
  if (query.includes('buy') || query.includes('purchase') || query.includes('shop') || 
      query.includes('product') || query.includes('price') || query.includes('cost')) {
    return [
      { message: "Searching for products...", duration: 2200 },
      { message: "Comparing prices and features...", duration: 2400 },
      { message: "Finding the best options...", duration: 0 }
    ];
  }
  
  // Location/Place queries
  if (query.includes('where') || query.includes('location') || query.includes('place') || 
      query.includes('address') || query.includes('directions') || query.includes('near')) {
    return [
      { message: "Let me find that location...", duration: 2000 },
      { message: "Getting the details...", duration: 0 }
    ];
  }
  
  // Creation/Generation
  if (query.includes('write') || query.includes('create') || query.includes('generate') || 
      query.includes('make') || query.includes('draft') || query.includes('compose')) {
    return [
      { message: "Understanding what you need...", duration: 2100 },
      { message: "Creating your content...", duration: 2300 },
      { message: "Putting the finishing touches...", duration: 0 }
    ];
  }
  
  // Complex queries (long or multi-part)
  if (query.length > 50 || query.split(' ').length > 10) {
    return [
      { message: "Let me process that for you...", duration: 2000 },
      { message: "Analyzing your request...", duration: 2200 },
      { message: "Preparing my response...", duration: 0 }
    ];
  }
  
  // Default for standard queries
  if (query.length > 20) {
    return [
      { message: "Let me help you with that...", duration: 2000 },
      { message: "Finding the information...", duration: 0 }
    ];
  }
  
  // Simple fallback for short queries
  return [{ message: "Let me think about that...", duration: 0 }];
};

const ProgressiveThinkingComponent: React.FC<ProgressiveThinkingProps> = ({
  userQuery,
  toolName,
  isStreaming = false,
  className = "",
  agentId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<ProgressiveStep[]>([{ message: "Thinking...", duration: 0 }]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Generate hardcoded progressive steps based on query and tool
  useEffect(() => {
    // Reset state
    setCurrentStepIndex(0);
    setIsCompleted(false);
    
    // Generate steps based on query and tool
    const generatedSteps = generateProgressiveSteps(userQuery, toolName);
    setSteps(generatedSteps);
  }, [userQuery, toolName]);

  // Auto-progress through steps
  useEffect(() => {
    if (isCompleted || steps.length <= 1) return;

    const currentStep = steps[currentStepIndex];
    
    // If current step has a duration, set timer to progress to next step
    if (currentStep.duration > 0 && currentStepIndex < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, currentStep.duration);

      return () => clearTimeout(timer);
    } else if (currentStepIndex === steps.length - 1) {
      // We've reached the last step
      setIsCompleted(true);
    }
  }, [currentStepIndex, steps, isCompleted]);

  const currentMessage = steps[currentStepIndex]?.message || "Thinking...";

  return (
    <>
      <ShimmerStyles />
      <motion.div
        data-testid="progressive-thinking"
        className={`w-full mx-auto max-w-3xl px-4 group/message dark:text-white ${className}`}
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: { delay: 0.5 } }}
        data-role="assistant"
      >
        <div className="flex gap-4 w-full">
          <div className="size-8 flex items-center justify-center shrink-0">
            <RiveGlint 
              isThinking={!isStreaming}
              isSpeaking={isStreaming}
              className="w-8 h-8"
            />
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-col gap-4 text-muted-foreground">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <ShimmerText className="text-base">
                    {currentMessage}
                  </ShimmerText>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export const ProgressiveThinking = memo(ProgressiveThinkingComponent, (prevProps, nextProps) => {
  // Only re-render if userQuery, agentId, or isStreaming changes
  return (
    prevProps.userQuery === nextProps.userQuery &&
    prevProps.agentId === nextProps.agentId &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.toolName === nextProps.toolName
  );
});