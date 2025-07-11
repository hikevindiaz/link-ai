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

function PureSuggestedActions({ chatId, chatbotId, append }: SuggestedActionsProps) {
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const response = await fetch(`/api/knowledge-sources?chatbotId=${chatbotId}`);
        if (!response.ok) return;
        
        const sources = await response.json();
        const allQuestions: string[] = [];
        
        for (const source of sources) {
          const qaResponse = await fetch(`/api/knowledge-sources/${source.id}/qa`);
          if (qaResponse.ok) {
            const qaPairs = await qaResponse.json();
            qaPairs.forEach((qa: any) => {
              if (qa.question && allQuestions.length < 4) {
                allQuestions.push(qa.question);
              }
            });
            if (allQuestions.length >= 4) break;
          }
        }
        
        setQuestions(allQuestions);
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    }

    if (chatbotId) {
      fetchQuestions();
    }
  }, [chatbotId]);

  if (questions.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full max-w-3xl mx-auto px-4 mb-6 dark:bg-black dark:text-neutral-100"
    >
      {questions.map((question, index) => (
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
                content: question,
                id: `${Date.now()}`
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm w-full h-auto min-h-[3.5rem] flex items-start justify-start hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <span className="font-medium line-clamp-2 break-words whitespace-pre-wrap overflow-hidden text-ellipsis">
              {question}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
