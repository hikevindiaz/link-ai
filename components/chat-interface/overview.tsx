import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ChatLogo } from '@/components/chat-interface/chat-logo';

interface OverviewProps {
  chatbotLogoURL?: string | null;
  chatbotName?: string | null;
}

export const Overview = ({ chatbotLogoURL, chatbotName }: OverviewProps) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only render after mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  
  const displayName = chatbotName || "Link AI";
  
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-6 leading-relaxed text-center max-w-xl">
        <div className="flex flex-col items-center space-y-3">
          <ChatLogo chatbotLogoURL={chatbotLogoURL} />
          <h2 className="text-xl font-semibold dark:text-white">{displayName}</h2>
        </div>
        <p className="text-xs dark:text-gray-300 text-gray-500">
          By using this chatbot, you agree to our{' '}
          <Link
            className="font-medium underline underline-offset-4 dark:text-gray-100"
            href="/terms"
            target="_blank"
          >
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link
            className="font-medium underline underline-offset-4 dark:text-gray-100"
            href="/privacy"
            target="_blank"
          >
            Privacy Policy
          </Link>
          . Your conversations may be stored to improve our services. Please do not share sensitive personal information through this interface.
        </p>
      </div>
    </motion.div>
  );
};
