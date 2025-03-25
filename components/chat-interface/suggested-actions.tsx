'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/chat-interface/ui/button';
import { Message } from 'ai';
import { memo, useEffect, useState } from 'react';

interface SuggestedActionsProps {
  chatId: string;
  chatbotId: string;
  append: (message: Message) => Promise<void>;
}

interface QAPair {
  question: string;
  answer: string;
}

function PureSuggestedActions({ chatId, chatbotId, append }: SuggestedActionsProps) {
  const [suggestedQuestions, setSuggestedQuestions] = useState<QAPair[]>([]);

  useEffect(() => {
    async function fetchQAPairs() {
      try {
        // Fetch knowledge sources
        const sourcesResponse = await fetch(`/api/agents/${chatbotId}/knowledge-sources`);
        if (!sourcesResponse.ok) {
          throw new Error('Failed to fetch knowledge sources');
        }
        
        const sources = await sourcesResponse.json();
        
        // Fetch QA pairs for each knowledge source
        const allQAPairs = await Promise.all(
          sources.map(async (source: any) => {
            const qaResponse = await fetch(`/api/knowledge-sources/${source.id}/qa`);
            if (!qaResponse.ok) return [];
            return qaResponse.json();
          })
        );
        
        // Flatten, filter, and limit to 4 questions
        const questions = allQAPairs
          .flat()
          .filter((qa: QAPair) => qa.question && qa.answer)
          .slice(0, 4);
        
        setSuggestedQuestions(questions);
      } catch (error) {
        console.error('Error fetching QA pairs:', error);
      }
    }

    if (chatbotId) {
      fetchQAPairs();
    }
  }, [chatbotId]);

  if (suggestedQuestions.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full dark:bg-black dark:text-gray-100"
    >
      {suggestedQuestions.map((qa, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={() => {
              append({
                role: 'user',
                content: qa.question,
                id: `${Date.now()}`
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            <span className="font-medium">{qa.question}</span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
