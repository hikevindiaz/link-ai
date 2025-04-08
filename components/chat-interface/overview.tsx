import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ChatLogo } from '@/components/chat-interface/chat-logo';

interface OverviewProps {
  chatbotLogoURL?: string | null;
  welcomeMessage?: string | null;
}

export const Overview = ({ chatbotLogoURL, welcomeMessage }: OverviewProps) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only render after mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  
  const displayMessage = welcomeMessage || "Hello! How can I assist you today?";
  
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-6 leading-relaxed text-center max-w-xl mx-auto">
        <div className="flex flex-col items-center space-y-3">
          <ChatLogo chatbotLogoURL={chatbotLogoURL} />
          <p className="text-base dark:text-gray-200 text-gray-700 mt-2 font-semibold">
            {displayMessage}
          </p>
        </div>
        <p className="text-xs dark:text-gray-300 text-gray-500">
          By using this chatbot, you agree to our{' '}
          <a
            href="https://getlinkai.com/legal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
          >
            Terms of Service 
          </a>
          <span className="text-xs dark:text-gray-300 text-gray-500"> and our </span>
          <a
            href="https://getlinkai.com/legal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
          >
            Privacy Policy
          </a>
          . Your conversations may be stored to improve our services. Please do not share sensitive personal information through this interface.
        </p>
      </div>
    </motion.div>
  );
};
