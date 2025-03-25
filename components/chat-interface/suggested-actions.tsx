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
        const response = await fetch(`/api/agents/${chatbotId}/knowledge-sources`);
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
      className="grid sm:grid-cols-2 gap-2 w-full dark:bg-black dark:text-gray-100"
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
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            <span className="font-medium">{question}</span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
