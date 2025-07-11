"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ChatFAQProps {
  faqs: Array<{ question: string, answer: string }>
  onSelectQuestion: (question: string) => void
}

export function ChatFAQ({ faqs, onSelectQuestion }: ChatFAQProps) {
  if (faqs.length === 0) return null

  return (
    <div className="px-4 py-3 border-t">
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        {faqs.map((faq, index) => (
          <button
            key={index}
            onClick={() => onSelectQuestion(faq.question)}
            className="flex-shrink-0 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-sm text-neutral-800 transition-colors whitespace-nowrap"
          >
            {faq.question}
          </button>
        ))}
      </div>
    </div>
  )
} 