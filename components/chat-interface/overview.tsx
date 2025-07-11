import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';



interface OverviewProps {
  chatbotId: string;
  chatbotLogoURL?: string | null;
  welcomeMessage?: string | null;
}

export const Overview = ({ chatbotId, chatbotLogoURL, welcomeMessage }: OverviewProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <p className="text-2xl md:text-3xl lg:text-4xl mt-2 text-center text-black dark:text-white"> 
          <span> 
            {displayMessage}
          </span>
        </p>
      </div>
    </motion.div>
  );
};
